
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
  ScrollView,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import mqtt, { MqttClient } from 'mqtt';
import Slider from '@react-native-community/slider';

const MQTTControl = () => {
  const [brokerIP, setBrokerIP] = useState('192.168.0.141');
  const [brokerPort, setBrokerPort] = useState('8083'); // WebSocket port
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [connectionLog, setConnectionLog] = useState<string[]>([]);
  const [switch1, setSwitch1] = useState(false);
  const [switch2, setSwitch2] = useState(false);
  const [loadcellValue, setLoadcellValue] = useState('XXX 單位');
  const [param2Value, setParam2Value] = useState('XXX 單位');
  const [param3Value, setParam3Value] = useState(0);
  const [param4Value, setParam4Value] = useState(0);
  
  const clientRef = useRef<MqttClient | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setConnectionLog(prev => [...prev.slice(-9), logMessage]);
  };

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        addLog('Cleaning up MQTT connection');
        clientRef.current.end(true);
      }
    };
  }, []);

  const connectMQTT = () => {
    try {
      addLog(`嘗試連接到 MQTT broker: ${brokerIP}:${brokerPort}`);
      setConnectionStatus('Connecting...');

      // Disconnect existing connection if any
      if (clientRef.current) {
        addLog('關閉現有連接');
        clientRef.current.end(true);
        clientRef.current = null;
      }

      // Try WebSocket connection first (for React Native)
      const wsUrl = `ws://${brokerIP}:${brokerPort}`;
      addLog(`使用 WebSocket URL: ${wsUrl}`);

      const options = {
        clientId: `mqtt_rn_${Math.random().toString(16).slice(3)}`,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        keepalive: 60,
        protocol: 'ws' as const,
        protocolVersion: 4,
      };

      addLog(`連接選項: ${JSON.stringify(options)}`);

      const client = mqtt.connect(wsUrl, options);

      client.on('connect', () => {
        addLog('✅ MQTT 連接成功！');
        setIsConnected(true);
        setConnectionStatus('Connected');
        
        // Subscribe to topics
        const topics = [
          'RadioRingCon77/system_state',
          'RadioRingCon77/LOADCELL',
          'RadioRingCon77/value2',
          'RadioRingCon77/slider_value1',
          'RadioRingCon77/slider_value2',
          'RadioRingCon77/switch1',
          'RadioRingCon77/switch2',
        ];

        topics.forEach(topic => {
          client.subscribe(topic, { qos: 0 }, (err) => {
            if (err) {
              addLog(`❌ 訂閱失敗 ${topic}: ${err.message}`);
            } else {
              addLog(`✅ 訂閱成功: ${topic}`);
            }
          });
        });
      });

      client.on('message', (topic, message) => {
        const msg = message.toString();
        addLog(`📨 收到訊息: ${topic} = ${msg}`);
        
        if (topic === 'RadioRingCon77/LOADCELL') {
          setLoadcellValue(msg);
        } else if (topic === 'RadioRingCon77/value2') {
          setParam2Value(msg);
        } else if (topic === 'RadioRingCon77/slider_value1') {
          const value = parseInt(msg) || 0;
          setParam3Value(Math.min(100, Math.max(0, value)));
        } else if (topic === 'RadioRingCon77/slider_value2') {
          const value = parseInt(msg) || 0;
          setParam4Value(Math.min(100, Math.max(0, value)));
        } else if (topic === 'RadioRingCon77/switch1') {
          setSwitch1(msg === 'on' || msg === '1' || msg === 'true');
        } else if (topic === 'RadioRingCon77/switch2') {
          setSwitch2(msg === 'on' || msg === '1' || msg === 'true');
        }
      });

      client.on('error', (err) => {
        addLog(`❌ MQTT 錯誤: ${err.message}`);
        setConnectionStatus(`Error: ${err.message}`);
        
        // Try TCP connection as fallback
        if (err.message.includes('WebSocket') || err.message.includes('ECONNREFUSED')) {
          addLog('WebSocket 連接失敗，嘗試 TCP 連接...');
          tryTcpConnection();
        }
      });

      client.on('close', () => {
        addLog('🔌 MQTT 連接已關閉');
        setIsConnected(false);
        setConnectionStatus('Disconnected');
      });

      client.on('offline', () => {
        addLog('📴 MQTT 離線');
        setIsConnected(false);
        setConnectionStatus('Offline');
      });

      client.on('reconnect', () => {
        addLog('🔄 正在重新連接...');
        setConnectionStatus('Reconnecting...');
      });

      clientRef.current = client;
    } catch (error: any) {
      addLog(`❌ 連接錯誤: ${error.message}`);
      Alert.alert('連接錯誤', `無法連接到 MQTT broker: ${error.message}`);
      setConnectionStatus('Error');
    }
  };

  const tryTcpConnection = () => {
    try {
      addLog('嘗試 TCP 連接 (port 1883)');
      
      if (clientRef.current) {
        clientRef.current.end(true);
      }

      const tcpUrl = `mqtt://${brokerIP}:1883`;
      addLog(`使用 TCP URL: ${tcpUrl}`);

      const options = {
        clientId: `mqtt_rn_tcp_${Math.random().toString(16).slice(3)}`,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        keepalive: 60,
      };

      const client = mqtt.connect(tcpUrl, options);

      client.on('connect', () => {
        addLog('✅ TCP 連接成功！');
        setIsConnected(true);
        setConnectionStatus('Connected (TCP)');
        
        const topics = [
          'RadioRingCon77/system_state',
          'RadioRingCon77/LOADCELL',
          'RadioRingCon77/value2',
          'RadioRingCon77/slider_value1',
          'RadioRingCon77/slider_value2',
          'RadioRingCon77/switch1',
          'RadioRingCon77/switch2',
        ];

        topics.forEach(topic => {
          client.subscribe(topic, { qos: 0 }, (err) => {
            if (err) {
              addLog(`❌ 訂閱失敗 ${topic}: ${err.message}`);
            } else {
              addLog(`✅ 訂閱成功: ${topic}`);
            }
          });
        });
      });

      client.on('message', (topic, message) => {
        const msg = message.toString();
        addLog(`📨 收到訊息: ${topic} = ${msg}`);
        
        if (topic === 'RadioRingCon77/LOADCELL') {
          setLoadcellValue(msg);
        } else if (topic === 'RadioRingCon77/value2') {
          setParam2Value(msg);
        } else if (topic === 'RadioRingCon77/slider_value1') {
          const value = parseInt(msg) || 0;
          setParam3Value(Math.min(100, Math.max(0, value)));
        } else if (topic === 'RadioRingCon77/slider_value2') {
          const value = parseInt(msg) || 0;
          setParam4Value(Math.min(100, Math.max(0, value)));
        } else if (topic === 'RadioRingCon77/switch1') {
          setSwitch1(msg === 'on' || msg === '1' || msg === 'true');
        } else if (topic === 'RadioRingCon77/switch2') {
          setSwitch2(msg === 'on' || msg === '1' || msg === 'true');
        }
      });

      client.on('error', (err) => {
        addLog(`❌ TCP 錯誤: ${err.message}`);
        setConnectionStatus(`TCP Error: ${err.message}`);
      });

      client.on('close', () => {
        addLog('🔌 TCP 連接已關閉');
        setIsConnected(false);
        setConnectionStatus('Disconnected');
      });

      clientRef.current = client;
    } catch (error: any) {
      addLog(`❌ TCP 連接錯誤: ${error.message}`);
      setConnectionStatus('TCP Error');
    }
  };

  const disconnectMQTT = () => {
    if (clientRef.current) {
      addLog('正在斷開連接...');
      clientRef.current.end(true);
      clientRef.current = null;
      setIsConnected(false);
      setConnectionStatus('Disconnected');
    }
  };

  const publishMessage = (topic: string, message: string) => {
    if (clientRef.current && isConnected) {
      clientRef.current.publish(topic, message, { qos: 0 }, (err) => {
        if (err) {
          addLog(`❌ 發送失敗 ${topic}: ${err.message}`);
        } else {
          addLog(`📤 已發送: ${topic} = ${message}`);
        }
      });
    } else {
      Alert.alert('未連接', '請先連接到 MQTT broker');
      addLog('❌ 未連接，無法發送訊息');
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

  const clearLog = () => {
    setConnectionLog([]);
    addLog('日誌已清除');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Connection Section */}
      <View style={styles.connectionSection}>
        <View style={styles.brokerRow}>
          <Text style={styles.label}>Broker IP:</Text>
          <TextInput
            style={styles.brokerInput}
            value={brokerIP}
            onChangeText={setBrokerIP}
            placeholder="192.168.0.141"
            editable={!isConnected}
            placeholderTextColor={colors.highlight}
          />
        </View>
        <View style={styles.brokerRow}>
          <Text style={styles.label}>WS Port:</Text>
          <TextInput
            style={styles.brokerInput}
            value={brokerPort}
            onChangeText={setBrokerPort}
            placeholder="8083"
            keyboardType="numeric"
            editable={!isConnected}
            placeholderTextColor={colors.highlight}
          />
        </View>
        <View style={styles.connectionButtons}>
          <TouchableOpacity
            style={[styles.connectionButton, styles.connectButton, isConnected && styles.disabledButton]}
            onPress={connectMQTT}
            disabled={isConnected}
          >
            <Text style={styles.buttonText}>Connect</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.connectionButton, styles.disconnectButton, !isConnected && styles.disabledButton]}
            onPress={disconnectMQTT}
            disabled={!isConnected}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>狀態:</Text>
          <Text style={[styles.statusValue, isConnected && styles.connectedText]}>
            {connectionStatus}
          </Text>
        </View>
      </View>

      {/* Connection Log */}
      <View style={styles.logSection}>
        <View style={styles.logHeader}>
          <Text style={styles.logTitle}>連接日誌</Text>
          <TouchableOpacity onPress={clearLog} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>清除</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.logContent} nestedScrollEnabled>
          {connectionLog.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
          {connectionLog.length === 0 && (
            <Text style={styles.logPlaceholder}>按下 Connect 開始連接...</Text>
          )}
        </ScrollView>
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
              disabled={!isConnected}
            />
          </View>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>開關2</Text>
            <Switch
              value={switch2}
              onValueChange={handleSwitch2Change}
              trackColor={{ false: colors.highlight, true: colors.secondary }}
              thumbColor={colors.card}
              disabled={!isConnected}
            />
          </View>
        </View>
      </View>

      {/* Radio Buttons Section */}
      <View style={styles.radioSection}>
        <TouchableOpacity
          style={[styles.radioButton, { backgroundColor: colors.accent }, !isConnected && styles.disabledButton]}
          onPress={() => handleButtonPress('RadioRingCon77/playmusic', '古典音樂')}
          disabled={!isConnected}
        >
          <Text style={styles.radioButtonText}>古典音樂</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, { backgroundColor: colors.accent }, !isConnected && styles.disabledButton]}
          onPress={() => handleButtonPress('RadioRingCon77/playmusic', '台中廣播')}
          disabled={!isConnected}
        >
          <Text style={styles.radioButtonText}>台中廣播</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, { backgroundColor: colors.accent }, !isConnected && styles.disabledButton]}
          onPress={() => handleButtonPress('RadioRingCon77/playmusic', '城市廣播')}
          disabled={!isConnected}
        >
          <Text style={styles.radioButtonText}>城市廣播</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.radioSection}>
        <TouchableOpacity
          style={[styles.radioButton, { backgroundColor: colors.accent }, !isConnected && styles.disabledButton]}
          onPress={() => handleButtonPress('RadioRingCon77/playmusic', '美食廣播')}
          disabled={!isConnected}
        >
          <Text style={styles.radioButtonText}>美食廣播</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, { backgroundColor: colors.accent }, !isConnected && styles.disabledButton]}
          onPress={() => handleButtonPress('RadioRingCon77/playmusic', '新客家廣播')}
          disabled={!isConnected}
        >
          <Text style={styles.radioButtonText}>新客家廣播</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, { backgroundColor: '#ffb6c1' }, !isConnected && styles.disabledButton]}
          onPress={() => handleButtonPress('RadioRingCon77/playmusic', 'stop')}
          disabled={!isConnected}
        >
          <Text style={styles.radioButtonText}>停止</Text>
        </TouchableOpacity>
      </View>

      {/* Direction Controls */}
      <View style={styles.directionSection}>
        <View style={styles.directionRow}>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: colors.highlight }, !isConnected && styles.disabledButton]}
            onPress={() => handleButtonPress('RadioRingCon77/#', 'A')}
            disabled={!isConnected}
          >
            <Text style={styles.directionButtonText}>A</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: '#87CEEB' }, !isConnected && styles.disabledButton]}
            onPress={() => handleButtonPress('RadioRingCon77/mpu6050/angleXYZ', 'Up')}
            disabled={!isConnected}
          >
            <Text style={styles.directionButtonText}>Up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: colors.highlight }, !isConnected && styles.disabledButton]}
            onPress={() => handleButtonPress('RadioRingCon77/#', 'B')}
            disabled={!isConnected}
          >
            <Text style={styles.directionButtonText}>B</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.directionRow}>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: '#87CEEB' }, !isConnected && styles.disabledButton]}
            onPress={() => handleButtonPress('RadioRingCon77/mpu6050/angleXYZ', 'Left')}
            disabled={!isConnected}
          >
            <Text style={styles.directionButtonText}>Left</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: '#ffb6c1' }, !isConnected && styles.disabledButton]}
            onPress={() => handleButtonPress('RadioRingCon77/mpu6050/angleXYZ', 'stop')}
            disabled={!isConnected}
          >
            <Text style={styles.directionButtonText}>stop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: '#87CEEB' }, !isConnected && styles.disabledButton]}
            onPress={() => handleButtonPress('RadioRingCon77/mpu6050/angleXYZ', 'Right')}
            disabled={!isConnected}
          >
            <Text style={styles.directionButtonText}>Right</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.directionRow}>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: colors.highlight }, !isConnected && styles.disabledButton]}
            onPress={() => handleButtonPress('RadioRingCon77/#', 'C')}
            disabled={!isConnected}
          >
            <Text style={styles.directionButtonText}>C</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: '#87CEEB' }, !isConnected && styles.disabledButton]}
            onPress={() => handleButtonPress('RadioRingCon77/mpu6050/angleXYZ', 'Down')}
            disabled={!isConnected}
          >
            <Text style={styles.directionButtonText}>Down</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: colors.secondary }, !isConnected && styles.disabledButton]}
            onPress={() => handleButtonPress('RadioRingCon77/#', '對講機')}
            disabled={!isConnected}
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

      <View style={{ height: 20 }} />
    </ScrollView>
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
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
    width: 80,
  },
  brokerInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    backgroundColor: colors.card,
    color: colors.text,
  },
  connectionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
  },
  statusValue: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  connectedText: {
    color: colors.secondary,
    fontWeight: 'bold',
  },
  logSection: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.text,
    maxHeight: 200,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  clearButton: {
    padding: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.highlight,
    borderRadius: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: colors.text,
  },
  logContent: {
    maxHeight: 150,
  },
  logText: {
    fontSize: 11,
    color: colors.text,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  logPlaceholder: {
    fontSize: 12,
    color: colors.highlight,
    fontStyle: 'italic',
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
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
    width: 80,
  },
  dataValue: {
    fontSize: 14,
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
    borderWidth: 1,
    borderColor: colors.text,
  },
  sliderFill: {
    height: '100%',
  },
  sliderEmpty: {
    height: '100%',
    backgroundColor: colors.highlight,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    width: 40,
    textAlign: 'right',
  },
});

export default MQTTControl;
