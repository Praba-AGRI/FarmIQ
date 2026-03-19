import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional

class IrrigationModel:
    def __init__(self, time_steps=14, features=9):
        self.time_steps = time_steps
        self.features = features
        self.model = self._build_model()
        
    def _build_model(self):
        """
        Inputs: 14 days window of:
        Temp, Humidity, Soil Moisture, ET0, ETc, Crop Stage, Crop Type, Field Size, Light Intensity
        Outputs: Predicted soil moisture (24h) and action probability
        """
        model = Sequential([
            Bidirectional(LSTM(64, activation='relu', return_sequences=True), input_shape=(self.time_steps, self.features)),
            Dropout(0.2),
            Bidirectional(LSTM(32, activation='relu')),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(2, activation='linear')  # idx 0: predicted moisture, idx 1: action threshold
        ])
        
        # Compile the model
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        return model
