
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import mqtt, { MqttClient } from 'mqtt';
import Slider from '@react-native-community/slider';

const MQTTControl = () => {
  const [brokerIP, setBrokerIP] = useState('192.168.0.141');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [switch1, setSwitch1] = useState(false);
  const [switch2, setSwitch2] = useState(false);
  const [loadcellValue, setLoadcellValue] = useState('XXX 單位');
  const [param2Value, setParam2Value] = useState('XXX 單位');
  const [param3Value, setParam3Value] = useState(0);
  const [param4Value, setParam4Value] = useState(0);
  
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end();
      }
    };
  }, []);

  const connectMQTT = () => {
    try {
      console.log('Connecting to MQTT broker at:', brokerIP);
      const client = mqtt.connect(`mqtt://${brokerIP}:1883`, {
        clientId: `mqtt_${Math.random().toString(16).slice(3)}`,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
      });

      client.on('connect', () => {
        console.log('MQTT Connected');
        setIsConnected(true);
        setConnectionStatus('Connected');
        
        // Subscribe to topics
        client.subscribe('RadioRingCon77/system_state', (err) => {
          if (err) console.log('Subscribe error:', err);
        });
        client.subscribe('RadioRingCon77/LOADCELL', (err) => {
          if (err) console.log('Subscribe error:', err);
        });
        client.subscribe('RadioRingCon77/value2', (err) => {
          if (err) console.log('Subscribe error:', err);
        });
        client.subscribe('RadioRingCon77/slider_value1', (err) => {
          if (err) console.log('Subscribe error:', err);
        });
        client.subscribe('RadioRingCon77/slider_value2', (err) => {
          if (err) console.log('Subscribe error:', err);
        });
        client.subscribe('RadioRingCon77/switch1', (err) => {
          if (err) console.log('Subscribe error:', err);
        });
        client.subscribe('RadioRingCon77/switch2', (err) => {
          if (err) console.log('Subscribe error:', err);
        });
      });

      client.on('message', (topic, message) => {
        const msg = message.toString();
        console.log('Received message:', topic, msg);
        
        if (topic === 'RadioRingCon77/LOADCELL') {
          setLoadcellValue(msg);
        } else if (topic === 'RadioRingCon77/value2') {
          setParam2Value(msg);
        } else if (topic === 'RadioRingCon77/slider_value1') {
          setParam3Value(parseInt(msg) || 0);
        } else if (topic === 'RadioRingCon77/slider_value2') {
          setParam4Value(parseInt(msg) || 0);
        } else if (topic === 'RadioRingCon77/switch1') {
          setSwitch1(msg === 'on' || msg === '1');
        } else if (topic === 'RadioRingCon77/switch2') {
          setSwitch2(msg === 'on' || msg === '1');
        }
      });

      client.on('error', (err) => {
        console.log('MQTT Error:', err);
        setConnectionStatus('Error: ' + err.message);
      });

      client.on('close', () => {
        console.log('MQTT Disconnected');
        setIsConnected(false);
        setConnectionStatus('Disconnected');
      });

      clientRef.current = client;
    } catch (error) {
      console.log('Connection error:', error);
      Alert.alert('Connection Error', 'Failed to connect to MQTT broker');
    }
  };

  const disconnectMQTT = () => {
    if (clientRef.current) {
      clientRef.current.end();
      clientRef.current = null;
      setIsConnected(false);
      setConnectionStatus('Disconnected');
    }
  };

  const publishMessage = (topic: string, message: string) => {
    if (clientRef.current && isConnected) {
      clientRef.current.publish(topic, message);
      console.log('Published:', topic, message);
    } else {
      Alert.alert('Not Connected', 'Please connect to MQTT broker first');
    }
  };

  const handleSwitch1Change = (value: boolean) => {
    setSwitch1(value);
    publishMessage('RadioRingCon77/switch1', value ? 'on' : 'off');
  };

  const handleSwitch2Change = (value: boolean) => {
    setSwitch2(value);
    publishMessage('RadioRingCon77/switch2', value ? 'on' : 'off');
  };

  const handleButtonPress = (topic: string, message: string) => {
    publishMessage(topic, message);
  };

  return (
    <View style={styles.container}>
      {/* Connection Section */}
      <View style={styles.connectionSection}>
        <View style={styles.brokerRow}>
          <Text style={styles.label}>Broker:</Text>
          <TextInput
            style={styles.brokerInput}
            value={brokerIP}
            onChangeText={setBrokerIP}
            placeholder="192.168.0.141"
            editable={!isConnected}
          />
        </View>
        <View style={styles.connectionButtons}>
          <TouchableOpacity
            style={[styles.connectionButton, styles.connectButton]}
            onPress={connectMQTT}
            disabled={isConnected}
          >
            <Text style={styles.buttonText}>Connect</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.connectionButton, styles.disconnectButton]}
            onPress={disconnectMQTT}
            disabled={!isConnected}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Switch Section */}
      <View style={styles.switchSection}>
        <View style={styles.switchRow}>
          <TouchableOpacity style={styles.numberButton}>
            <Text style={styles.numberButtonText}>1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numberButton}>
            <Text style={styles.numberButtonText}>2</Text>
          </TouchableOpacity>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>開關1</Text>
            <Switch
              value={switch1}
              onValueChange={handleSwitch1Change}
              trackColor={{ false: colors.highlight, true: colors.secondary }}
              thumbColor={colors.card}
            />
          </View>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>開關2</Text>
            <Switch
              value={switch2}
              onValueChange={handleSwitch2Change}
              trackColor={{ false: colors.highlight, true: colors.secondary }}
              thumbColor={colors.card}
            />
          </View>
        </View>
      </View>

      {/* Radio Buttons Section */}
      <View style={styles.radioSection}>
        <TouchableOpacity
          style={[styles.radioButton, { backgroundColor: colors.accent }]}
          onPress={() => handleButtonPress('RadioRingCon77/playmusic', '古典音樂')}
        >
          <Text style={styles.radioButtonText}>古典音樂</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, { backgroundColor: colors.accent }]}
          onPress={() => handleButtonPress('RadioRingCon77/playmusic', '台中廣播')}
        >
          <Text style={styles.radioButtonText}>台中廣播</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, { backgroundColor: colors.accent }]}
          onPress={() => handleButtonPress('RadioRingCon77/playmusic', '城市廣播')}
        >
          <Text style={styles.radioButtonText}>城市廣播</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.radioSection}>
        <TouchableOpacity
          style={[styles.radioButton, { backgroundColor: colors.accent }]}
          onPress={() => handleButtonPress('RadioRingCon77/playmusic', '美食廣播')}
        >
          <Text style={styles.radioButtonText}>美食廣播</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, { backgroundColor: colors.accent }]}
          onPress={() => handleButtonPress('RadioRingCon77/playmusic', '新客家廣播')}
        >
          <Text style={styles.radioButtonText}>新客家廣播</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, { backgroundColor: '#ffb6c1' }]}
          onPress={() => handleButtonPress('RadioRingCon77/playmusic', 'stop')}
        >
          <Text style={styles.radioButtonText}>停止</Text>
        </TouchableOpacity>
      </View>

      {/* Direction Controls */}
      <View style={styles.directionSection}>
        <View style={styles.directionRow}>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: colors.highlight }]}
            onPress={() => handleButtonPress('RadioRingCon77/#', 'A')}
          >
            <Text style={styles.directionButtonText}>A</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: '#87CEEB' }]}
            onPress={() => handleButtonPress('RadioRingCon77/mpu6050/angleXYZ', 'Up')}
          >
            <Text style={styles.directionButtonText}>Up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: colors.highlight }]}
            onPress={() => handleButtonPress('RadioRingCon77/#', 'B')}
          >
            <Text style={styles.directionButtonText}>B</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.directionRow}>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: '#87CEEB' }]}
            onPress={() => handleButtonPress('RadioRingCon77/mpu6050/angleXYZ', 'Left')}
          >
            <Text style={styles.directionButtonText}>Left</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: '#ffb6c1' }]}
            onPress={() => handleButtonPress('RadioRingCon77/mpu6050/angleXYZ', 'stop')}
          >
            <Text style={styles.directionButtonText}>stop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: '#87CEEB' }]}
            onPress={() => handleButtonPress('RadioRingCon77/mpu6050/angleXYZ', 'Right')}
          >
            <Text style={styles.directionButtonText}>Right</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.directionRow}>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: colors.highlight }]}
            onPress={() => handleButtonPress('RadioRingCon77/#', 'C')}
          >
            <Text style={styles.directionButtonText}>C</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: '#87CEEB' }]}
            onPress={() => handleButtonPress('RadioRingCon77/mpu6050/angleXYZ', 'Down')}
          >
            <Text style={styles.directionButtonText}>Down</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: colors.secondary }]}
            onPress={() => handleButtonPress('RadioRingCon77/#', '對講機')}
          >
            <Text style={styles.directionButtonText}>對講機</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Display Section */}
      <View style={styles.dataSection}>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>LOADCELL:</Text>
          <Text style={styles.dataValue}>{loadcellValue}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>參數2:</Text>
          <Text style={styles.dataValue}>{param2Value}</Text>
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.dataLabel}>參數3:</Text>
          <View style={styles.sliderContainer}>
            <View style={[styles.sliderFill, { width: `${param3Value}%`, backgroundColor: '#ff6b6b' }]} />
            <View style={[styles.sliderEmpty, { width: `${100 - param3Value}%` }]} />
          </View>
          <Text style={styles.sliderValue}>{param3Value}</Text>
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.dataLabel}>參數4:</Text>
          <View style={styles.sliderContainer}>
            <View style={[styles.sliderFill, { width: `${param4Value}%`, backgroundColor: '#87CEEB' }]} />
            <View style={[styles.sliderEmpty, { width: `${100 - param4Value}%` }]} />
          </View>
          <Text style={styles.sliderValue}>{param4Value}</Text>
        </View>
      </View>

      {/* Status Section */}
      <View style={styles.statusSection}>
        <Text style={styles.statusLabel}>State:</Text>
        <Text style={styles.statusValue}>{connectionStatus}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  connectionSection: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.text,
  },
  brokerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
  },
  brokerInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  connectionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  connectionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  connectButton: {
    backgroundColor: colors.secondary,
  },
  disconnectButton: {
    backgroundColor: '#ff6b6b',
  },
  buttonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchSection: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  numberButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.text,
  },
  numberButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  switchContainer: {
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  radioSection: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  radioButton: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.text,
  },
  radioButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  directionSection: {
    marginBottom: 8,
  },
  directionRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  directionButton: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.text,
  },
  directionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  dataSection: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.text,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  dataLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
  },
  dataValue: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  sliderContainer: {
    flex: 1,
    height: 24,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  sliderFill: {
    height: '100%',
  },
  sliderEmpty: {
    height: '100%',
    backgroundColor: colors.highlight,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    width: 40,
    textAlign: 'right',
  },
  statusSection: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.text,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
  },
  statusValue: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
});

export default MQTTControl;
