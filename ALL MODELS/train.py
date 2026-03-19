import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
import joblib
from sklearn.metrics import mean_absolute_error, accuracy_score, classification_report
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split

from models.irrigation_model import IrrigationModel
from models.nutrient_model import NutrientRecommendationModel
from models.pest_model import PestDiseasePredictionModel

def load_sensor_data(time_steps=14):
    """
    Load time-series sensor data from generated CSV and preprocess into 14-day sliding windows.
    Returns: X_train (samples, 7, 9), y_train (samples, 2)
    """
    try:
        df = pd.read_csv('tn_multicrop_ag_dataset.csv')
    except FileNotFoundError:
        print("Dataset not found. Run generate_data.py first.")
        return None, None
        
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values(by=['Crop_Type', 'Date']).reset_index(drop=True)
    
    # Encode categorical features
    crop_le = LabelEncoder()
    stage_le = LabelEncoder()
    df['Crop_Type_Encoded'] = crop_le.fit_transform(df['Crop_Type'])
    df['Crop_Stage_Encoded'] = stage_le.fit_transform(df['Crop_Stage'])
    
    feature_cols = ['T_Avg', 'Humidity', 'Soil_Moisture', 'ET0', 'ETc', 
                    'Crop_Stage_Encoded', 'Crop_Type_Encoded', 'GDD_Cumulative', 'Light_Intensity']
                    
    scaler = MinMaxScaler()
    df[feature_cols] = scaler.fit_transform(df[feature_cols])
    
    X, y = [], []
    
    for crop in df['Crop_Type'].unique():
        crop_data = df[df['Crop_Type'] == crop].copy()
        features = crop_data[feature_cols].values
        
        target_moisture = features[:, 2] 
        target_event = crop_data['Irrigation_Event'].values
        
        for i in range(len(crop_data) - time_steps):
            window = features[i:(i + time_steps)]
            
            y_moisture = target_moisture[i + time_steps]
            y_event = target_event[i + time_steps]
            
            X.append(window)
            y.append([y_moisture, y_event])
            
    X_train = np.array(X)
    y_train = np.array(y)
    print(f"Prepared Data Shapes -> X: {X_train.shape}, y: {y_train.shape}")
    return X_train, y_train

def load_nutrient_data():
    try:
        df = pd.read_csv('simplified_nutrient_data.csv')
    except FileNotFoundError:
        print("Dataset not found.")
        return None, None
    
    crop_le = LabelEncoder()
    stage_le = LabelEncoder()
    df['Crop_Type_Encoded'] = crop_le.fit_transform(df['Crop_Type'])
    df['Crop_Stage_Encoded'] = stage_le.fit_transform(df['Crop_Stage'])
    
    # Save the label encoders for later inference mapping
    joblib.dump(crop_le, 'crop_le.pkl')
    joblib.dump(stage_le, 'stage_le.pkl')
    
    X = df[['Crop_Type_Encoded', 'Crop_Stage_Encoded', 'Field_Size_Acres']].values
    y = df[['Target_N_kg', 'Target_P_kg', 'Target_K_kg']].values
    
    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    return X_train, X_test, y_train, y_test

def load_pest_data():
    try:
        df = pd.read_csv('pest_data.csv')
    except FileNotFoundError:
        print("Dataset pest_data.csv not found.")
        return None
        
    crop_le = LabelEncoder()
    stage_le = LabelEncoder()
    season_le = LabelEncoder()
    label_le = LabelEncoder()
    
    df['Crop_Type'] = crop_le.fit_transform(df['Crop_Type'])
    df['Crop_Stage'] = stage_le.fit_transform(df['Crop_Stage'])
    df['Season'] = season_le.fit_transform(df['Season'])
    df['Disease_Risk_Label'] = label_le.fit_transform(df['Disease_Risk_Label'])
    
    # Save encoders for categorical translation mapping
    import joblib
    joblib.dump(crop_le, 'pest_crop_le.pkl')
    joblib.dump(stage_le, 'pest_stage_le.pkl')
    joblib.dump(season_le, 'pest_season_le.pkl')
    joblib.dump(label_le, 'pest_label_le.pkl')
    
    feature_cols = ['Crop_Type', 'Crop_Stage', 'Season', 'Temperature_C', 'Humidity_pct']
    X = df[feature_cols].values
    y = df['Disease_Risk_Label'].values
    
    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    return X_train, X_test, y_train, y_test, label_le

def load_phenology_data():
    try:
        df = pd.read_csv('gdd_stage_data.csv')
    except FileNotFoundError:
        print("Dataset gdd_stage_data.csv not found.")
        return None
        
    crop_le = LabelEncoder()
    stage_le = LabelEncoder()
    
    df['Crop_Type_Encoded'] = crop_le.fit_transform(df['Crop_Type'])
    df['Crop_Stage_Encoded'] = stage_le.fit_transform(df['Crop_Stage'])
    
    # Save encoders
    joblib.dump(crop_le, 'gdd_crop_le.pkl')
    joblib.dump(stage_le, 'gdd_stage_le.pkl')
    
    X = df[['Crop_Type_Encoded', 'Cumulative_GDD']].values
    y = df['Crop_Stage_Encoded'].values
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    return X_train, X_test, y_train, y_test, crop_le, stage_le

def train_irrigation_model():
    print("Training Irrigation LSTM model...")
    X_train, y_train = load_sensor_data()
    
    if X_train is None: 
        return None
    
    irrigation_logic = IrrigationModel(time_steps=14, features=9)
    model = irrigation_logic.model
    
    # Smart Training Callbacks
    early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
    lr_scheduler = ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5)
    
    print("Fitting model...")
    model.fit(
        X_train, y_train, 
        epochs=100, 
        batch_size=32, 
        validation_split=0.2,
        callbacks=[early_stop, lr_scheduler]
    )
    
    model.save('irrigation_lstm.h5')
    print("Irrigation model trained and saved as irrigation_lstm.h5!")
    return model

def train_nutrient_model():
    print("Training Nutrient Random Forest Regressor...")
    X_train, X_test, y_train, y_test = load_nutrient_data()
    if X_train is None:
        return None
        
    nutrient_logic = NutrientRecommendationModel()
    model = nutrient_logic.model
    
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"Nutrient Model Evaluated. Test MAE: {mae:.2f} kg")
    
    joblib.dump(model, 'nutrient_rf_model.pkl')
    print("Nutrient model trained and saved as nutrient_rf_model.pkl")
    return model

def train_pest_model():
    print("Training Pest Random Forest Classifier...")
    res = load_pest_data()
    if res is None:
        return None
    X_train, X_test, y_train, y_test, label_le = res
    
    pest_logic = PestDiseasePredictionModel()
    model = pest_logic.model
    
    model.fit(X_train, y_train)
    
    from sklearn.metrics import accuracy_score, classification_report
    preds = model.predict(X_test)
    
    acc = accuracy_score(y_test, preds)
    print(f"\nPest Model Evaluated. Test Accuracy: {acc:.4f}\n")
    
    target_names = label_le.inverse_transform(np.unique(y_test))
    report = classification_report(y_test, preds, zero_division=0)
    print("Classification Report:\n", report)
    
    import joblib
    joblib.dump(model, 'pest_rf_model.pkl')
    print("Pest model trained and saved as pest_rf_model.pkl")
    return model

def train_phenology_model():
    print("Training Phenology Decision Tree Classifier...")
    res = load_phenology_data()
    if res is None:
        return None
    X_train, X_test, y_train, y_test, crop_le, stage_le = res
    
    model = DecisionTreeClassifier(random_state=42)
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"Phenology Model Evaluated. Test Accuracy: {acc:.4f}")
    
    joblib.dump(model, 'gdd_stage_model.pkl')
    print("Phenology model trained and saved as gdd_stage_model.pkl")
    return model

if __name__ == "__main__":
    print("Initializing architecture for Multi-Model Pipeline...")
    
    # trained_lstm = train_irrigation_model()
    # trained_nutrient_rf = train_nutrient_model()
    # trained_pest_rf = train_pest_model()
    trained_gdd_phenology = train_phenology_model()
    
    print("Pipeline compilation complete.")
