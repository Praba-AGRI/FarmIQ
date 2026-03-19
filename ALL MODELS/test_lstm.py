import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error

def test_model():
    print("Loading trained LSTM model...")
    # Load model and compile False to avoid custom metric deserialization issues
    model = load_model('irrigation_lstm.h5', compile=False)
    
    # Load and prepare some data to evaluate accuracy
    print("Loading data for evaluation...")
    df = pd.read_csv('tn_multicrop_ag_dataset.csv')
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values(by=['Crop_Type', 'Date']).reset_index(drop=True)
    
    crop_le = LabelEncoder()
    stage_le = LabelEncoder()
    df['Crop_Type_Encoded'] = crop_le.fit_transform(df['Crop_Type'])
    df['Crop_Stage_Encoded'] = stage_le.fit_transform(df['Crop_Stage'])
    
    feature_cols = ['T_Avg', 'Humidity', 'Soil_Moisture', 'ET0', 'ETc', 
                    'Crop_Stage_Encoded', 'Crop_Type_Encoded', 'GDD_Cumulative', 'Light_Intensity']
                    
    scaler = MinMaxScaler()
    df[feature_cols] = scaler.fit_transform(df[feature_cols])
    
    time_steps = 14
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
            
    # Take a portion as test set
    X_test = np.array(X)[-500:] 
    y_test = np.array(y)[-500:]
    
    print("Evaluating model...")
    predictions_all = model.predict(X_test)
    mse_val = mean_squared_error(y_test, predictions_all)
    mae_val = mean_absolute_error(y_test, predictions_all)
    print(f"Test Loss (MSE): {mse_val:.4f}")
    print(f"Test MAE: {mae_val:.4f}")
    
    print("\nTesting on 5 mock sequences from the dataset:")
    mock_X = X_test[-5:]
    mock_y = y_test[-5:]
    
    predictions = model.predict(mock_X)
    
    for i in range(5):
        print(f"--- Mock Sequence {i+1} ---")
        print(f"Predicted -> Moisture (Scaled): {predictions[i][0]:.4f}, Irrigation Prob: {predictions[i][1]:.4f}")
        print(f"Actual    -> Moisture (Scaled): {mock_y[i][0]:.4f}, Irrigation Event: {mock_y[i][1]:.4f}")
        print()

if __name__ == '__main__':
    test_model()
