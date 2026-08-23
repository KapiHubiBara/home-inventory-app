import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  ActivityIndicator, 
  ScrollView, 
  StatusBar, 
  Modal, 
  KeyboardAvoidingView, 
  Platform, 
  Image, 
  Switch, 
  Dimensions,
  PanResponder
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = 'https://home-inventory-backend-nfun.onrender.com';
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_CONTAINER_PADDING = 10;

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const THEMES = {
  light: {
    isDark: false,
    bgApp: '#ffffff',
    bgContent: '#f6f8fa',
    bgCard: '#ffffff',
    bgInput: '#f0f2f5',
    textMain: '#1c1e21',
    textSub: '#65676b',
    border: '#e4e6eb',
    borderLight: '#ced4da',
    emptyText: '#8e8e93',
    navBg: '#ffffff',
    navBorder: '#e2e8f0',
    navText: '#64748b',
    navTabMagazyn: '#fafafa',
    navTabSiatka: '#f8fafc',
    navTabZakupy: '#fafafa',
    navTabUstawienia: '#f8fafc',
    navTabSkaner: '#fafafa',
    activeTabMagazynBg: '#eef4ff',
    activeTabSiatkaBg: '#ecfdf5',
    activeTabZakupyBg: '#fffbeb',
    activeTabUstawieniaBg: '#f3e8ff',
    activeTabSkanerBg: '#f5f3ff',
  },
  dark: {
    isDark: true,
    bgApp: '#0f172a',
    bgContent: '#090d16',
    bgCard: '#1e293b',
    bgInput: '#334155',
    textMain: '#f8fafc',
    textSub: '#94a3b8',
    border: '#334155',
    borderLight: '#475569',
    emptyText: '#64748b',
    navBg: '#0f172a',
    navBorder: '#1e293b',
    navText: '#94a3b8',
    navTabMagazyn: '#131d31',
    navTabSiatka: '#0f172a',
    navTabZakupy: '#131d31',
    navTabUstawienia: '#0f172a',
    navTabSkaner: '#131d31',
    activeTabMagazynBg: '#1e3a8a',
    activeTabSiatkaBg: '#064e3b',
    activeTabZakupyBg: '#78350f',
    activeTabUstawieniaBg: '#581c87',
    activeTabSkanerBg: '#4c1d95',
  }
};

const INITIAL_ROOM_DEFS = [
  { id: 'room-garaz', name: 'Garaż', icon: '🚗', color: '#ced4da', border: '#adb5bd', textColor: '#343a40' },
  { id: 'room-spizarnia', name: 'Spiżarnia', icon: '🥫', color: '#ffd8a8', border: '#f76707', textColor: '#d9480f' },
  { id: 'room-lazienka', name: 'Łazienka', icon: '🚿', color: '#c3fae8', border: '#20c997', textColor: '#0ca678' },
  { id: 'room-kuchnia', name: 'Kuchnia', icon: '🍳', color: '#c5f6fa', border: '#15aabf', textColor: '#0c8599' },
  { id: 'room-salon', name: 'Salon / Biuro', icon: '🛋️', color: '#dbe4ff', border: '#4c6ef5', textColor: '#364fc7' }
];

const generateInitialGridCells = (rows, cols) => {
  const cells = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r < 4 && c < 5) cells[`${r}-${c}`] = 'room-garaz';
      else if (r < 4 && c >= 5 && c < 10) cells[`${r}-${c}`] = 'room-spizarnia';
      else if (r < 4 && c >= 10) cells[`${r}-${c}`] = 'room-lazienka';
      else if (r >= 5 && c < 7) cells[`${r}-${c}`] = 'room-kuchnia';
      else if (r >= 5 && c >= 7) cells[`${r}-${c}`] = 'room-salon';
      else cells[`${r}-${c}`] = null;
    }
  }
  return cells;
};

const INITIAL_ROOM_FURNITURE_DEFS = {
  'Kuchnia': [
    { id: 'furn-zlew', name: 'Zlew', icon: '🚰', color: '#a5d8ff', border: '#339af0', textColor: '#1864ab' },
    { id: 'furn-szafka1', name: 'Szafka dolna', icon: '🗄️', color: '#ffec99', border: '#fcc419', textColor: '#f59f00' },
    { id: 'furn-lodowka', name: 'Lodówka', icon: '🧊', color: '#b2f2bb', border: '#51cf66', textColor: '#2b8a3e' }
  ]
};

const generateInitialSubGridCells = (rows, cols) => {
  const cells = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r < 3 && c < 3) cells[`${r}-${c}`] = 'furn-zlew';
      else if (r < 3 && c >= 3) cells[`${r}-${c}`] = 'furn-szafka1';
      else if (r >= 3) cells[`${r}-${c}`] = 'furn-lodowka';
      else cells[`${r}-${c}`] = null;
    }
  }
  return cells;
};

const PREDEFINED_COLORS = [
  '#ff8787', '#ffc9c9', '#ff922b', '#ffd8a8', '#fcc419', '#ffe066', 
  '#51cf66', '#c3fae8', '#339af0', '#a5d8ff', '#845ef7', '#d0bfff', 
  '#f8f9fa', '#ced4da', '#495057'
];

export default function App() {
  const [authToken, setAuthToken] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0);

  // Stany dla resetowania hasła PIN-em
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetPin, setResetPin] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetErrorMessage, setResetErrorMessage] = useState('');

  const [themeMode, setThemeMode] = useState('light');
  const t = THEMES[themeMode];

  const [activeTab, setActiveTab] = useState('inventory');
  const [inventoryViewMode, setInventoryViewMode] = useState('list');
  const [expandedNodes, setExpandedNodes] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('Wszystko');
  const [selectedExpiryFilters, setSelectedExpiryFilters] = useState(['Wszystkie daty']);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [gridRows, setGridRows] = useState(10);
  const [gridCols, setGridCols] = useState(16);
  const [roomDefs, setRoomDefs] = useState(INITIAL_ROOM_DEFS);
  const [gridCells, setGridCells] = useState(() => generateInitialGridCells(10, 16));
  const [isGridEditorMode, setIsGridEditorMode] = useState(false);
  const [activePaintTool, setActivePaintTool] = useState('room-salon');
  const [selectedRoomOnMap, setSelectedRoomOnMap] = useState('Salon / Biuro');

  const [insideRoom, setInsideRoom] = useState(null);
  const [subGridRows, setSubGridRows] = useState(6);
  const [subGridCols, setSubGridCols] = useState(8);
  const [subGridDefs, setSubGridDefs] = useState(INITIAL_ROOM_FURNITURE_DEFS);
  const [subGridCells, setSubGridCells] = useState(() => generateInitialSubGridCells(6, 8));
  const [isSubGridEditorMode, setIsSubGridEditorMode] = useState(false);
  const [activeSubPaintTool, setActiveSubPaintTool] = useState('furn-zlew');
  const [selectedFurnitureOnMap, setSelectedFurnitureOnMap] = useState(null);

  const [isAddRoomDefModalVisible, setIsAddRoomDefModalVisible] = useState(false);
  const [newRoomDefName, setNewRoomDefName] = useState('');
  const [newRoomDefIcon, setNewRoomDefIcon] = useState('📦');

  const [isEditRoomModalVisible, setIsEditRoomModalVisible] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState(null);

  const [isAddFurnDefModalVisible, setIsAddFurnDefModalVisible] = useState(false);
  const [newFurnDefName, setNewFurnDefName] = useState('');
  const [newFurnDefIcon, setNewFurnDefIcon] = useState('🗄️');

  const [newlyAddedItemIds, setNewlyAddedItemIds] = useState([]);
  const [customShoppingItems, setCustomShoppingItems] = useState([]);
  const [newShoppingInput, setNewShoppingInput] = useState('');
  const [boughtShoppingItemIds, setBoughtShoppingItemIds] = useState([]);

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanningLoading, setScanningLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formFurniture, setFormFurniture] = useState('');
  const [formSpot, setFormSpot] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formUnit, setFormUnit] = useState('szt');
  const [formHasFillLevel, setFormHasFillLevel] = useState(false);
  const [formFillLevel, setFormFillLevel] = useState(100);
  const [formExpiry, setFormExpiry] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');

  const fillLevels = [100, 75, 50, 25, 10, 0];
  const expiryFilters = [
    'Wszystkie daty',
    '☠️ Przeterminowane',
    '⚠️ Lekko przeterminowane',
    '⏳ Uwaga (do 7 dni)',
    '💡 Do miesiąca',
    '✅ Długi termin',
    '⚪ Brak daty'
  ];

  const dynamicCellSize = Math.floor((SCREEN_WIDTH - 32 - (GRID_CONTAINER_PADDING * 2)) / gridCols);
  const dynamicSubCellSize = Math.floor((SCREEN_WIDTH - 32 - (GRID_CONTAINER_PADDING * 2)) / subGridCols);

  // Sprawdzanie zapisanej sesji przy starcie
  useEffect(() => {
    const checkSavedSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('user_jwt_token');
        if (savedToken) {
          setAuthToken(savedToken);
          setRememberMe(true);
        }
      } catch (e) {
        console.log('Błąd odczytu sesji:', e);
      } finally {
        setAuthChecking(false);
      }
    };
    checkSavedSession();
  }, []);

  // Pobieranie danych po zalogowaniu
  useEffect(() => {
    if (authToken) {
      fetchItems();
      fetchMapConfig();
    }
  }, [authToken]);

  const handleAuthSubmit = async () => {
    setAuthErrorMessage('');
    if (!authUsername.trim() || !authPassword.trim()) {
      const msg = 'Wpisz nazwę użytkownika i hasło.';
      setAuthErrorMessage(msg);
      showAlert('Błąd', msg);
      return;
    }

    if (authMode === 'register' && (!authPin.trim() || authPin.trim().length < 4)) {
      const msg = 'PIN ratunkowy musi mieć minimum 4 cyfry.';
      setAuthErrorMessage(msg);
      showAlert('Błąd', msg);
      return;
    }

    try {
      setAuthLoading(true);
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const payload = {
        username: authUsername.trim(),
        password: authPassword
      };

      if (authMode === 'register') {
        payload.pin = authPin.trim();
      }

      const response = await axios.post(`${BACKEND_URL}${endpoint}`, payload);
      const token = response.data.token;
      
      setAuthToken(token);

      if (rememberMe) {
        await AsyncStorage.setItem('user_jwt_token', token);
      } else {
        await AsyncStorage.removeItem('user_jwt_token');
      }

      setAuthPassword('');
      setAuthPin('');
      setAuthErrorMessage('');
    } catch (error) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail || '';
      let errorMsg = 'Wystąpił nieoczekiwany błąd logowania.';

      if (authMode === 'login') {
        if (status === 404 || (typeof detail === 'string' && detail.toLowerCase().includes('user'))) {
          errorMsg = 'Nie znaleziono użytkownika.';
        } else if (status === 401 || (typeof detail === 'string' && (detail.toLowerCase().includes('password') || detail.toLowerCase().includes('credential') || detail.toLowerCase().includes('incorrect')))) {
          errorMsg = 'Błędne hasło.';
        } else {
          errorMsg = typeof detail === 'string' && detail ? detail : 'Nie znaleziono użytkownika lub błędne hasło.';
        }
      } else {
        errorMsg = typeof detail === 'string' && detail ? detail : 'Błąd rejestracji – użytkownik może już istnieć.';
      }

      setAuthErrorMessage(errorMsg);
      showAlert('Błąd', errorMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetErrorMessage('');
    if (!resetUsername.trim() || !resetPin.trim() || !resetNewPassword.trim()) {
      setResetErrorMessage('Wypełnij wszystkie pola formularza.');
      return;
    }

    if (resetNewPassword.length < 4) {
      setResetErrorMessage('Nowe hasło musi mieć minimum 4 znaki.');
      return;
    }

    try {
      setResetLoading(true);
      await axios.post(`${BACKEND_URL}/auth/reset-password`, {
        username: resetUsername.trim(),
        pin: resetPin.trim(),
        new_password: resetNewPassword
      });

      showAlert('Sukces', 'Hasło zostało pomyślnie zmienione! Możesz się teraz zalogować.');
      setIsResetModalVisible(false);
      setResetUsername('');
      setResetPin('');
      setResetNewPassword('');
      setResetErrorMessage('');
      setAuthErrorMessage('');
    } catch (error) {
      const detail = error.response?.data?.detail || 'Nie udało się zresetować hasła.';
      setResetErrorMessage(typeof detail === 'string' ? detail : 'Błąd resetowania hasła.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      try {
        await AsyncStorage.clear();
      } catch (e) {
        console.log('Błąd czyszczenia pamięci', e);
      }
      setAuthToken(null);
      setAuthUsername('');
      setAuthPassword('');
      setAuthPin('');
      setRememberMe(false);
      setItems([]);
      setActiveTab('inventory');
      setForceUpdate(prev => prev + 1);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Czy na pewno chcesz się wylogować?')) {
        await doLogout();
      }
    } else {
      Alert.alert('Wylogowanie', 'Czy na pewno chcesz się wylogować?', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Wyloguj', style: 'destructive', onPress: doLogout }
      ]);
    }
  };

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${authToken}` }
  });

  const gridPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isGridEditorMode,
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const c = Math.floor(locationX / dynamicCellSize);
        const r = Math.floor(locationY / dynamicCellSize);
        if (r >= 0 && r < gridRows && c >= 0 && c < gridCols) {
          const key = `${r}-${c}`;
          if (gridCells[key] !== activePaintTool) {
            setGridCells(prev => ({
              ...prev,
              [key]: activePaintTool === 'eraser' ? null : activePaintTool
            }));
          }
        }
      }
    })
  ).current;

  const subGridPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isSubGridEditorMode,
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const c = Math.floor(locationX / dynamicSubCellSize);
        const r = Math.floor(locationY / dynamicSubCellSize);
        if (r >= 0 && r < subGridRows && c >= 0 && c < subGridCols) {
          const key = `${r}-${c}`;
          if (subGridCells[key] !== activeSubPaintTool) {
            setSubGridCells(prev => ({
              ...prev,
              [key]: activeSubPaintTool === 'eraser' ? null : activeSubPaintTool
            }));
          }
        }
      }
    })
  ).current;

  const getRoomBoundingBox = (roomId) => {
    let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
    let count = 0;
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (gridCells[`${r}-${c}`] === roomId) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
          count++;
        }
      }
    }
    if (count === 0) return null;
    return {
      top: minR * dynamicCellSize,
      left: minC * dynamicCellSize,
      width: (maxC - minC + 1) * dynamicCellSize,
      height: (maxR - minR + 1) * dynamicCellSize
    };
  };

  const getFurnBoundingBox = (furnId) => {
    let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
    let count = 0;
    for (let r = 0; r < subGridRows; r++) {
      for (let c = 0; c < subGridCols; c++) {
        if (subGridCells[`${r}-${c}`] === furnId) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
          count++;
        }
      }
    }
    if (count === 0) return null;
    return {
      top: minR * dynamicSubCellSize,
      left: minC * dynamicSubCellSize,
      width: (maxC - minC + 1) * dynamicSubCellSize,
      height: (maxR - minR + 1) * dynamicSubCellSize
    };
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/items`, getAuthHeaders());
      setItems(response.data);
    } catch (error) {
      console.log('Błąd pobierania danych:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMapConfig = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/map-config`, getAuthHeaders());
      if (response.data && !response.data.error) {
        if (response.data.gridRows) setGridRows(response.data.gridRows);
        if (response.data.gridCols) setGridCols(response.data.gridCols);
        if (response.data.gridCells) setGridCells(response.data.gridCells);
        if (response.data.roomDefs) setRoomDefs(response.data.roomDefs);
        if (response.data.themeMode) setThemeMode(response.data.themeMode);
        if (response.data.inventoryViewMode) setInventoryViewMode(response.data.inventoryViewMode);
      }
    } catch (error) {
      console.log('Brak zapisanego planu w bazie lub błąd:', error.message);
    }
  };

  const saveMapConfig = async (newTheme = themeMode, newViewMode = inventoryViewMode) => {
    try {
      await axios.post(`${BACKEND_URL}/map-config`, {
        gridRows,
        gridCols,
        gridCells,
        roomDefs,
        themeMode: newTheme,
        inventoryViewMode: newViewMode
      }, getAuthHeaders());
    } catch (error) {
      console.log('Błąd zapisu konfiguracji:', error.message);
    }
  };

  const handleToggleEditorMode = async () => {
    if (isGridEditorMode) {
      await saveMapConfig(themeMode, inventoryViewMode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert("Sukces", "Plan mieszkania został zapisany w bazie!");
    }
    setIsGridEditorMode(!isGridEditorMode);
  };

  const handleThemeChange = async (mode) => {
    setThemeMode(mode);
    Haptics.selectionAsync();
    await saveMapConfig(mode, inventoryViewMode);
  };

  const handleViewModeChange = async (mode) => {
    setInventoryViewMode(mode);
    Haptics.selectionAsync();
    await saveMapConfig(themeMode, mode);
  };

  const handleDismissNewBadge = (itemId) => {
    setNewlyAddedItemIds(prev => prev.filter(id => id !== itemId));
  };

  const parseLocationHierarchy = (locString) => {
    if (!locString) return { room: '', furniture: '', spot: '', full: '' };
    const parts = locString.split(' > ').map(p => p.trim());
    return {
      room: parts[0] || '',
      furniture: parts[1] || '',
      spot: parts[2] || '',
      full: locString
    };
  };

  const parseItemNotes = (notes) => {
    if (!notes) return { hasFill: false, fillLevel: 100 };
    const hasFill = notes.includes('tracking:fill');
    let fillLevel = 100;
    if (notes.includes('fill:')) {
      const match = notes.match(/fill:(\d+)/);
      if (match) fillLevel = parseInt(match[1]);
    }
    return { hasFill, fillLevel };
  };

  const getExpiryStatus = (dateString) => {
    if (!dateString) return null;
    const target = new Date(dateString);
    if (isNaN(target.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays <= -3) {
      return { type: 'expired', filterKey: '☠️ Przeterminowane', diffDays, label: `☠️ Przeterminowany (${Math.abs(diffDays)} dni temu)`, bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' };
    }
    if (diffDays < 0) {
      return { type: 'slightly_expired', filterKey: '⚠️ Lekko przeterminowane', diffDays, label: `⚠️ Lekko przeterminowany (${Math.abs(diffDays)} dni temu)`, bg: '#ffe8cc', text: '#d9480f', border: '#ffd8a8' };
    }
    if (diffDays <= 7) {
      return { type: 'warning', filterKey: '⏳ Uwaga (do 7 dni)', diffDays, label: `⏳ Uwaga! Zostało ${diffDays === 0 ? 'mniej niż 24h' : diffDays + ' dni'}`, bg: '#fff3cd', text: '#856404', border: '#ffeeba' };
    }
    if (diffDays <= 30) {
      return { type: 'use_soon', filterKey: '💡 Do miesiąca', diffDays, label: `💡 Wykorzystaj (zostało ${diffDays} dni)`, bg: '#e7f3ff', text: '#1877f2', border: '#b8daff' };
    }
    return { type: 'good', filterKey: '✅ Długi termin', diffDays, label: `✅ Wszystko jest super (${dateString})`, bg: '#d4edda', text: '#155724', border: '#c3e6cb' };
  };

  const toggleExpiryFilter = (filter) => {
    Haptics.selectionAsync();
    if (filter === 'Wszystkie daty') {
      setSelectedExpiryFilters(['Wszystkie daty']);
      return;
    }
    let updated = selectedExpiryFilters.filter(f => f !== 'Wszystkie daty');
    if (updated.includes(filter)) {
      updated = updated.filter(f => f !== filter);
    } else {
      updated.push(filter);
    }
    setSelectedExpiryFilters(updated.length === 0 ? ['Wszystkie daty'] : updated);
  };

  const toggleTreeNode = (nodePath) => {
    setExpandedNodes(prev => ({ ...prev, [nodePath]: !prev[nodePath] }));
  };

  const handleCellClick = (r, c) => {
    const key = `${r}-${c}`;
    if (isGridEditorMode) {
      Haptics.selectionAsync();
      setGridCells(prev => ({
        ...prev,
        [key]: activePaintTool === 'eraser' ? null : activePaintTool
      }));
    } else {
      const assignedRoomId = gridCells[key];
      if (assignedRoomId) {
        const foundDef = roomDefs.find(rd => rd.id === assignedRoomId);
        if (foundDef) {
          setSelectedRoomOnMap(foundDef.name);
          setInsideRoom(null);
          setSelectedFurnitureOnMap(null);
        }
      }
    }
  };

  const handleSubCellClick = (r, c) => {
    const key = `${r}-${c}`;
    const currentFurnDefs = subGridDefs[insideRoom] || [];

    if (isSubGridEditorMode) {
      Haptics.selectionAsync();
      setSubGridCells(prev => ({
        ...prev,
        [key]: activeSubPaintTool === 'eraser' ? null : activeSubPaintTool
      }));
    } else {
      const assignedFurnId = subGridCells[key];
      if (assignedFurnId) {
        const foundFurn = currentFurnDefs.find(fd => fd.id === assignedFurnId);
        if (foundFurn) setSelectedFurnitureOnMap(foundFurn.name);
      }
    }
  };

  const openEditRoomModal = (roomDef) => {
    setRoomToEdit(roomDef);
    setNewRoomDefName(roomDef.name);
    setNewRoomDefIcon(roomDef.icon);
    setIsEditRoomModalVisible(true);
  };

  const handleSaveEditedRoom = () => {
    if (!newRoomDefName.trim() || !roomToEdit) return;
    setRoomDefs(prev => prev.map(rd => rd.id === roomToEdit.id ? { ...rd, name: newRoomDefName.trim(), icon: newRoomDefIcon, color: roomToEdit.color } : rd));
    setIsEditRoomModalVisible(false);
    setRoomToEdit(null);
  };

  const handleChangeGridDimension = (dimension, delta) => {
    Haptics.selectionAsync();
    if (dimension === 'rows') {
      setGridRows(prev => Math.max(4, Math.min(24, prev + delta)));
    } else {
      setGridCols(prev => Math.max(6, Math.min(24, prev + delta)));
    }
  };

  const handleChangeSubGridDimension = (dimension, delta) => {
    Haptics.selectionAsync();
    if (dimension === 'rows') {
      setSubGridRows(prev => Math.max(4, Math.min(16, prev + delta)));
    } else {
      setSubGridCols(prev => Math.max(4, Math.min(16, prev + delta)));
    }
  };

  const handleDeleteWholeRoom = (roomDef) => {
    const deleteAction = () => {
      setGridCells(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(k => {
          if (updated[k] === roomDef.id) updated[k] = null;
        });
        return updated;
      });
      setRoomDefs(prev => prev.filter(r => r.id !== roomDef.id));
      if (activePaintTool === roomDef.id) setActivePaintTool('eraser');
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Czy na pewno chcesz usunąć pokój "${roomDef.name}" z mapy?`)) {
        deleteAction();
      }
    } else {
      Alert.alert("Usuń pokój", `Czy na pewno chcesz usunąć pokój "${roomDef.name}" z mapy?`, [
        { text: "Anuluj", style: "cancel" },
        { text: "Usuń pokój", style: "destructive", onPress: deleteAction }
      ]);
    }
  };

  const handleDeleteWholeFurniture = (furnDef) => {
    const deleteAction = () => {
      setSubGridCells(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(k => {
          if (updated[k] === furnDef.id) updated[k] = null;
        });
        return updated;
      });
      setSubGridDefs(prev => {
        const list = prev[insideRoom] || [];
        return { ...prev, [insideRoom]: list.filter(f => f.id !== furnDef.id) };
      });
      if (activeSubPaintTool === furnDef.id) setActiveSubPaintTool('eraser');
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Czy na pewno chcesz usunąć mebel "${furnDef.name}" z pokoju?`)) {
        deleteAction();
      }
    } else {
      Alert.alert("Usuń mebel", `Czy na pewno chcesz usunąć mebel "${furnDef.name}" z pokoju?`, [
        { text: "Anuluj", style: "cancel" },
        { text: "Usuń mebel", style: "destructive", onPress: deleteAction }
      ]);
    }
  };

  const handleClearWholeGrid = () => {
    const clearAction = () => {
      const empty = {};
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          empty[`${r}-${c}`] = null;
        }
      }
      setGridCells(empty);
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Zresetować wszystkie kratki mieszkań do pustych pól?")) {
        clearAction();
      }
    } else {
      Alert.alert("Wyczyść całą mapę", "Zresetować wszystkie kratki mieszkań do pustych pól?", [
        { text: "Anuluj", style: "cancel" },
        { text: "Wyczyść", style: "destructive", onPress: clearAction }
      ]);
    }
  };

  const handleClearWholeSubGrid = () => {
    const clearAction = () => {
      const empty = {};
      for (let r = 0; r < subGridRows; r++) {
        for (let c = 0; c < subGridCols; c++) {
          empty[`${r}-${c}`] = null;
        }
      }
      setSubGridCells(empty);
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Zresetować wszystkie kratki w tym pokoju?")) {
        clearAction();
      }
    } else {
      Alert.alert("Wyczyść układ pokoju", "Zresetować wszystkie kratki w tym pokoju?", [
        { text: "Anuluj", style: "cancel" },
        { text: "Wyczyść", style: "destructive", onPress: clearAction }
      ]);
    }
  };

  const handleAddNewRoomDef = () => {
    if (!newRoomDefName.trim()) return;
    const newDef = {
      id: `room-custom-${Date.now()}`,
      name: newRoomDefName.trim(),
      icon: newRoomDefIcon,
      color: '#f8f0fc',
      border: '#e599f7',
      textColor: '#ae3ec9'
    };
    setRoomDefs(prev => [...prev, newDef]);
    setActivePaintTool(newDef.id);
    setIsAddRoomDefModalVisible(false);
    setNewRoomDefName('');
  };

  const handleAddNewFurnDef = () => {
    if (!newFurnDefName.trim() || !insideRoom) return;
    const newDef = {
      id: `furn-custom-${Date.now()}`,
      name: newFurnDefName.trim(),
      icon: newFurnDefIcon,
      color: '#e7f5ff',
      border: '#74c0fc',
      textColor: '#1c7ed6'
    };
    setSubGridDefs(prev => {
      const currentList = prev[insideRoom] || [];
      return { ...prev, [insideRoom]: [...currentList, newDef] };
    });
    setActiveSubPaintTool(newDef.id);
    setIsAddFurnDefModalVisible(false);
    setNewFurnDefName('');
  };

  const handleOpenAddModal = (initialData = {}) => {
    const loc = parseLocationHierarchy(initialData.location);
    setIsEditing(false);
    setEditingId(null);
    setFormName(initialData.name || '');
    setFormBrand(initialData.brand || '');
    setFormBarcode(initialData.barcode || '');
    setFormCategory(initialData.category || '');
    setFormRoom(initialData.room || loc.room || insideRoom || selectedRoomOnMap || (roomDefs[0]?.name || ''));
    setFormFurniture(initialData.furniture || loc.furniture || selectedFurnitureOnMap || '');
    setFormSpot(initialData.spot || loc.spot || '');
    setFormQuantity(initialData.quantity ? String(initialData.quantity) : '1');
    setFormUnit(initialData.unit || 'szt');
    setFormHasFillLevel(initialData.hasFill || false);
    setFormFillLevel(initialData.fillLevel || 100);
    setFormExpiry(initialData.expiry_date || '');
    setFormImageUrl(initialData.image_url || '');
    setModalVisible(true);
  };

  const handleOpenEditModal = (item) => {
    const loc = parseLocationHierarchy(item.location);
    setIsEditing(true);
    setEditingId(item.id);
    setFormName(item.name || '');
    setFormBrand(item.brand || '');
    setFormBarcode(item.barcode || '');
    setFormCategory(item.category || '');
    setFormRoom(loc.room || '');
    setFormFurniture(loc.furniture || '');
    setFormSpot(loc.spot || '');
    setFormQuantity(item.quantity !== undefined ? String(item.quantity) : '1');
    setFormUnit(item.unit || 'szt');
    const { hasFill, fillLevel } = parseItemNotes(item.notes);
    setFormHasFillLevel(hasFill);
    setFormFillLevel(fillLevel);
    setFormExpiry(item.expiry_date || '');
    setFormImageUrl(item.image_url || '');
    setModalVisible(true);
  };

  const handleOpenRestockModal = (item, isCustom = false) => {
    if (isCustom) {
      handleOpenAddModal({ name: item.name });
    } else {
      const { hasFill } = parseItemNotes(item.notes);
      const loc = parseLocationHierarchy(item.location);
      setIsEditing(true);
      setEditingId(item.id);
      setFormName(item.name || '');
      setFormBrand(item.brand || '');
      setFormBarcode(item.barcode || '');
      setFormCategory(item.category || '');
      setFormRoom(loc.room || '');
      setFormFurniture(loc.furniture || '');
      setFormSpot(loc.spot || '');
      setFormQuantity('1');
      setFormUnit(item.unit || 'szt');
      setFormHasFillLevel(hasFill);
      setFormFillLevel(100);
      setFormExpiry('');
      setFormImageUrl(item.image_url || '');
      setModalVisible(true);
    }
  };

  const handleSaveItem = async () => {
    if (!formName.trim()) {
      showAlert('Błąd', 'Nazwa produktu jest wymagana.');
      return;
    }

    if (!formRoom.trim()) {
      showAlert('Wskaż pokój! 🗺️', 'Wybierz pokój na siatce mieszkania.');
      return;
    }

    const qty = parseFloat(formQuantity) || 0.0;
    const isOutOfStock = qty === 0 || (formHasFillLevel && formFillLevel === 0 && qty <= 1);
    const notesPayload = formHasFillLevel ? `tracking:fill,fill:${formFillLevel}` : 'tracking:qty';

    const locParts = [formRoom.trim()];
    if (formFurniture.trim()) locParts.push(formFurniture.trim());
    if (formSpot.trim()) locParts.push(formSpot.trim());
    const finalLocation = locParts.join(' > ');

    const payload = {
      name: formName.trim(),
      barcode: formBarcode.trim() || null,
      brand: formBrand.trim() || null,
      quantity: qty,
      unit: formUnit.trim() || 'szt',
      location: finalLocation,
      category: formCategory.trim() || 'inne',
      status: isOutOfStock ? 'zużyte' : 'w_magazynie',
      expiry_date: formExpiry.trim() || null,
      notes: notesPayload,
      image_url: formImageUrl.trim() || null
    };

    try {
      if (isEditing) {
        await axios.put(`${BACKEND_URL}/items/${editingId}`, payload, getAuthHeaders());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showAlert("Sukces", "Pomyślnie zaktualizowano magazyn!");
        setBoughtShoppingItemIds(prev => prev.filter(id => id !== editingId));
        setNewlyAddedItemIds(prev => [...new Set([...prev, editingId])]);
      } else {
        const response = await axios.post(`${BACKEND_URL}/items`, payload, getAuthHeaders());
        const newId = response.data?.item?.id;
        if (newId) setNewlyAddedItemIds(prev => [...new Set([...prev, newId])]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showAlert("Sukces", "Pomyślnie dodano produkt do magazynu!");
      }
      setModalVisible(false);
      fetchItems();
    } catch (error) {
      showAlert('Błąd zapisu', JSON.stringify(error.response?.data?.detail) || error.message);
    }
  };

  const handleDeleteItem = (item) => {
    const deleteAction = async () => {
      try {
        await axios.delete(`${BACKEND_URL}/items/${item.id}`, getAuthHeaders());
        setNewlyAddedItemIds(prev => prev.filter(id => id !== item.id));
        fetchItems();
      } catch (error) {
        showAlert('Błąd usuwania', error.response?.data?.detail || error.message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Czy na pewno chcesz usunąć "${item.name}"?`)) {
        deleteAction();
      }
    } else {
      Alert.alert("Usuń produkt", `Czy na pewno chcesz usunąć "${item.name}"?`, [
        { text: "Anuluj", style: "cancel" },
        { text: "Usuń", style: "destructive", onPress: deleteAction }
      ]);
    }
  };

  const handleUpdateFillLevel = async (item, newLevel) => {
    Haptics.selectionAsync();
    let newQty = item.quantity ?? 1;
    let finalFillLevel = newLevel;
    let newStatus = item.status || 'w_magazynie';

    if (newLevel === 0) {
      if (newQty > 1) {
        newQty = newQty - 1;
        finalFillLevel = 100;
        showAlert("Otwarto nowy zapas!", `Zużyto 1 opakowanie. Zostało: ${newQty} ${item.unit || 'szt'}.`);
      } else {
        newQty = 0;
        newStatus = 'zużyte';
      }
    }

    const newNotes = `tracking:fill,fill:${finalFillLevel}`;
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, quantity: newQty, notes: newNotes, status: newStatus } : i)));

    try {
      const payload = {
        name: item.name,
        barcode: item.barcode || null,
        brand: item.brand || null,
        quantity: newQty,
        unit: item.unit || 'szt',
        location: item.location || 'Spiżarnia',
        category: item.category || 'inne',
        status: newStatus,
        expiry_date: item.expiry_date || null,
        notes: newNotes,
        image_url: item.image_url || null
      };
      await axios.put(`${BACKEND_URL}/items/${item.id}`, payload, getAuthHeaders());
    } catch (error) {
      fetchItems();
    }
  };

  const handleQuantityChange = async (item, delta) => {
    Haptics.selectionAsync();
    const currentQty = typeof item.quantity === 'number' ? item.quantity : (parseFloat(item.quantity) || 0);
    const newQty = Math.max(0, currentQty + delta);
    const { hasFill } = parseItemNotes(item.notes);

    const notesPayload = hasFill 
      ? (newQty > 0 && currentQty === 0 ? 'tracking:fill,fill:100' : item.notes)
      : 'tracking:qty';

    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, quantity: newQty, notes: notesPayload } : i)));

    try {
      const payload = {
        name: item.name,
        barcode: item.barcode || null,
        brand: item.brand || null,
        quantity: newQty,
        unit: item.unit || 'szt',
        location: item.location || 'Spiżarnia',
        category: item.category || 'inne',
        status: newQty === 0 ? 'zużyte' : (item.status || 'w_magazynie'),
        expiry_date: item.expiry_date || null,
        notes: notesPayload,
        image_url: item.image_url || null
      };
      await axios.put(`${BACKEND_URL}/items/${item.id}`, payload, getAuthHeaders());
    } catch (error) {
      fetchItems();
    }
  };

  const toggleBoughtShoppingItem = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBoughtShoppingItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleAddCustomShoppingItem = () => {
    if (!newShoppingInput.trim()) return;
    Haptics.selectionAsync();
    setCustomShoppingItems(prev => [{ id: `custom-${Date.now()}`, name: newShoppingInput.trim(), isCustom: true }, ...prev]);
    setNewShoppingInput('');
  };

  const handleRemoveCustomShoppingItem = (id) => {
    setCustomShoppingItems(prev => prev.filter(item => item.id !== id));
    setBoughtShoppingItemIds(prev => prev.filter(itemId => itemId !== id));
  };

  const handleBarcodeScanned = async ({ data }) => {
    setScanned(true);
    setScanningLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const response = await axios.get(`${BACKEND_URL}/barcode/${data}`);
      const scannedProduct = response.data;
      setScanned(false);
      setActiveTab('inventory');
      handleOpenAddModal({
        name: scannedProduct.name,
        brand: scannedProduct.brand,
        barcode: data,
        category: scannedProduct.category || 'żywność',
        image_url: scannedProduct.image_url || ''
      });
    } catch (error) {
      showAlert("Nieznany kod EAN", `Kod: ${data}\nUzupełnij dane i wskaż pokój na siatce.`);
      setScanned(false);
      setActiveTab('inventory');
      handleOpenAddModal({ barcode: data });
    } finally {
      setScanningLoading(false);
    }
  };

  const inStockItems = items.filter(item => {
    const { hasFill, fillLevel } = parseItemNotes(item.notes);
    if (item.status === 'zużyte' || item.quantity <= 0) return false;
    if (hasFill && item.quantity === 1 && fillLevel === 0) return false;
    return true;
  });

  const availableRooms = ['Wszystko', ...new Set(roomDefs.map(r => r.name))];

  const urgentItemsCount = inStockItems.filter(item => {
    const status = getExpiryStatus(item.expiry_date);
    return status && (status.type === 'expired' || status.type === 'slightly_expired' || status.type === 'warning');
  }).length;

  const expiredCount = inStockItems.filter(item => {
    const status = getExpiryStatus(item.expiry_date);
    return status && (status.type === 'expired' || status.type === 'slightly_expired');
  }).length;

  const warningCount = inStockItems.filter(item => {
    const status = getExpiryStatus(item.expiry_date);
    return status && status.type === 'warning';
  }).length;

  const handleFilterUrgentFromWidget = () => {
    setSelectedExpiryFilters(['☠️ Przeterminowane', '⚠️ Lekko przeterminowane', '⏳ Uwaga (do 7 dni)']);
    setSelectedRoomFilter('Wszystko');
  };

  const outOfStockItems = items.filter(item => {
    const { hasFill, fillLevel } = parseItemNotes(item.notes);
    if (item.status === 'zużyte' || item.quantity <= 0) return true;
    if (hasFill && item.quantity === 1 && fillLevel <= 25) return true;
    return false;
  });

  const totalShoppingCount = outOfStockItems.length + customShoppingItems.length;

  const filteredAndSortedItems = inStockItems
    .filter(item => {
      const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.location || '').toLowerCase().includes(searchQuery.toLowerCase());
       
      const loc = parseLocationHierarchy(item.location);
      const matchesRoom = selectedRoomFilter === 'Wszystko' || loc.room === selectedRoomFilter;

      let matchesExpiry = true;
      if (!selectedExpiryFilters.includes('Wszystkie daty')) {
        const status = getExpiryStatus(item.expiry_date);
        if (!item.expiry_date) {
          matchesExpiry = selectedExpiryFilters.includes('⚪ Brak daty');
        } else if (status) {
          matchesExpiry = selectedExpiryFilters.includes(status.filterKey);
        } else {
          matchesExpiry = false;
        }
      }
      return matchesSearch && matchesRoom && matchesExpiry;
    })
    .sort((a, b) => {
      const statusA = getExpiryStatus(a.expiry_date);
      const statusB = getExpiryStatus(b.expiry_date);
      return (statusA ? statusA.diffDays : Infinity) - (statusB ? statusB.diffDays : Infinity);
    });

  const buildLocationTree = (itemList) => {
    const tree = {};
    itemList.forEach(item => {
      const loc = parseLocationHierarchy(item.location);
      const room = loc.room || 'Nieprzypisane';
      const furniture = loc.furniture || 'Główne miejsce';
      const spot = loc.spot || 'Półka';

      if (!tree[room]) tree[room] = { count: 0, furnitures: {} };
      tree[room].count += 1;
      if (!tree[room].furnitures[furniture]) tree[room].furnitures[furniture] = { count: 0, spots: {} };
      tree[room].furnitures[furniture].count += 1;
      if (!tree[room].furnitures[furniture].spots[spot]) tree[room].furnitures[furniture].spots[spot] = [];
      tree[room].furnitures[furniture].spots[spot].push(item);
    });
    return tree;
  };

  const locationTree = buildLocationTree(filteredAndSortedItems);
  const isFormValid = Boolean(formName.trim() && formRoom.trim());

  const getFillColor = (level) => {
    if (level > 50) return '#28a745';
    if (level > 25) return '#ffc107';
    return '#dc3545';
  };

  const renderItemCard = (item) => {
    const expiryStatus = getExpiryStatus(item.expiry_date);
    const { hasFill, fillLevel } = parseItemNotes(item.notes);
    const isNew = newlyAddedItemIds.includes(item.id);

    return (
      <View key={item.id} style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }, isNew && styles.cardHighlightNew]}>
        <View style={styles.cardHeader}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.itemThumbnail} resizeMode="cover" />
          ) : null}

          <View style={{ flex: 1, marginLeft: item.image_url ? 10 : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.cardTitle, { color: t.textMain }]}>{item.name}</Text>
              {isNew && (
                <TouchableOpacity style={styles.newBadge} onPress={() => handleDismissNewBadge(item.id)}>
                  <Text style={styles.newBadgeText}>✨ NOWOŚĆ ✕</Text>
                </TouchableOpacity>
              )}
            </View>
            {item.brand ? <Text style={[styles.cardSubtitle, { color: t.textSub }]}>{item.brand}</Text> : null}
          </View>
           
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleOpenEditModal(item)}>
              <Text>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteItem(item)}>
              <Text style={styles.deleteIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tagsContainer}>
          {item.location ? (
            <View style={[styles.tagLocationHierarchy, t.isDark && { backgroundColor: '#1e3a8a', borderColor: '#3b82f6' }]}>
              <Text style={[styles.tagLocationHierarchyText, t.isDark && { color: '#93c5fd' }]}>📍 {item.location}</Text>
            </View>
          ) : null}
          {item.category ? (
            <View style={[styles.tagCategory, { backgroundColor: t.bgInput }]}>
              <Text style={[styles.tagText, { color: t.textSub }]}>🏷️ {item.category}</Text>
            </View>
          ) : null}
        </View>

        {expiryStatus ? (
          <View style={[styles.expiryBadge, { backgroundColor: expiryStatus.bg, borderColor: expiryStatus.border }]}>
            <Text style={[styles.expiryBadgeText, { color: expiryStatus.text }]}>{expiryStatus.label}</Text>
          </View>
        ) : null}

        {hasFill ? (
          <View style={[styles.fillLevelSection, { borderTopColor: t.border }]}>
            <View style={styles.fillHeader}>
              <Text style={[styles.fillLabel, { color: t.textSub }]}>Stan otwartego opakowania:</Text>
              <Text style={[styles.fillValue, { color: getFillColor(fillLevel) }]}>{fillLevel}%</Text>
            </View>
            <View style={[styles.progressBarBackground, { backgroundColor: t.bgInput }]}>
              <View style={[styles.progressBarFill, { width: `${fillLevel}%`, backgroundColor: getFillColor(fillLevel) }]} />
            </View>
            <View style={styles.fillBtnRow}>
              {[100, 50, 25, 10, 0].map((lvl) => (
                <TouchableOpacity 
                  key={lvl} 
                  style={[styles.fillMiniBtn, { backgroundColor: t.bgInput, borderColor: t.border }, fillLevel === lvl && styles.fillMiniBtnActive]} 
                  onPress={() => handleUpdateFillLevel(item, lvl)}
                >
                  <Text style={[styles.fillMiniBtnText, { color: t.textSub }, fillLevel === lvl && styles.fillMiniBtnTextActive]}>
                    {lvl === 0 ? 'Koniec' : `${lvl}%`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.cardFooter, { borderTopColor: t.border }]}>
          <View style={styles.quantityDisplay}>
            <Text style={[styles.quantityNumber, { color: t.textMain }]}>{item.quantity ?? 1}</Text>
            <Text style={[styles.quantityUnit, { color: t.textSub }]}> {item.unit || 'szt'}</Text>
            {hasFill && item.quantity > 1 ? (
              <Text style={styles.extraStockBadge}> (+{item.quantity - 1} w zapasie)</Text>
            ) : null}
          </View>
           
          <View style={styles.counterControls}>
            <TouchableOpacity style={[styles.counterBtn, { backgroundColor: t.bgInput }]} onPress={() => handleQuantityChange(item, -1)}>
              <Text style={[styles.counterBtnText, { color: t.textMain }]}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.counterBtn, { backgroundColor: t.bgInput }]} onPress={() => handleQuantityChange(item, 1)}>
              <Text style={[styles.counterBtnText, { color: t.textMain }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (authChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!authToken) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#f8fafc', marginBottom: 6, textAlign: 'center' }}>Home Inventory</Text>
          <Text style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24, textAlign: 'center' }}>
            {authMode === 'login' ? 'Zaloguj się na swoje konto' : 'Utwórz nowe konto'}
          </Text>

          <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>Nazwa użytkownika</Text>
          <TextInput 
            style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: 14, borderRadius: 10, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#334155' }}
            placeholder="np. hubert"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            value={authUsername}
            onChangeText={setAuthUsername}
          />

          <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>Hasło</Text>
          <View style={{ position: 'relative', justifyContent: 'center', marginBottom: 14 }}>
            <TextInput 
              style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: 14, paddingRight: 50, borderRadius: 10, fontSize: 15, borderWidth: 1, borderColor: '#334155' }}
              placeholder="minimum 4 znaki"
              placeholderTextColor="#64748b"
              secureTextEntry={!showAuthPassword}
              value={authPassword}
              onChangeText={setAuthPassword}
            />
            <TouchableOpacity 
              onPress={() => setShowAuthPassword(!showAuthPassword)}
              style={{ position: 'absolute', right: 14, top: 14 }}
            >
              <Text style={{ fontSize: 18 }}>{showAuthPassword ? '👁️‍🗨️' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {authMode === 'register' && (
            <>
              <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
                PIN ratunkowy do odzyskiwania konta (min. 4 cyfry)
              </Text>
              <TextInput 
                style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: 14, borderRadius: 10, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#334155' }}
                placeholder="np. 1234"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                maxLength={6}
                value={authPin}
                onChangeText={setAuthPin}
              />
            </>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, backgroundColor: '#1e293b', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155' }}>
            <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '600' }}>Zapamiętaj mnie</Text>
            <Switch 
              value={rememberMe} 
              onValueChange={setRememberMe} 
              trackColor={{ false: '#334155', true: '#2563eb' }}
            />
          </View>

          {authErrorMessage ? (
            <View style={{ backgroundColor: '#f87171', padding: 10, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ color: '#7f1d1d', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
                ⚠️ {authErrorMessage}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity 
            style={{ backgroundColor: '#2563eb', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 }}
            onPress={handleAuthSubmit}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>
                {authMode === 'login' ? 'Zaloguj się' : 'Zarejestruj się'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login');
              setAuthErrorMessage('');
            }}
            style={{ padding: 8, alignItems: 'center' }}
          >
            <Text style={{ color: '#93c5fd', fontSize: 14, fontWeight: '600' }}>
              {authMode === 'login' ? 'Nie masz konta? Zarejestruj się ➔' : 'Masz już konto? Zaloguj się ➔'}
            </Text>
          </TouchableOpacity>

          {authMode === 'login' && (
            <TouchableOpacity 
              onPress={() => {
                setResetErrorMessage('');
                setIsResetModalVisible(true);
              }}
              style={{ padding: 8, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600' }}>
                Nie pamiętasz hasła? Zresetuj PIN-em
              </Text>
            </TouchableOpacity>
          )}

          {/* ==================== MODAL RESETOWANIA HASŁA PIN-EM ==================== */}
          <Modal visible={isResetModalVisible} animationType="slide" transparent={true}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
              <View style={[styles.modalContent, { backgroundColor: '#1e293b' }]}>
                <Text style={[styles.modalTitle, { color: '#f8fafc' }]}>🔑 Reset hasła PIN-em</Text>
                
                <Text style={[styles.inputLabel, { color: '#94a3b8' }]}>Nazwa użytkownika</Text>
                <TextInput 
                  style={[styles.modalInput, { backgroundColor: '#0f172a', color: '#f8fafc' }]} 
                  placeholder="Twój login"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  value={resetUsername}
                  onChangeText={setResetUsername}
                />

                <Text style={[styles.inputLabel, { color: '#94a3b8' }]}>Twój 4-cyfrowy PIN ratunkowy</Text>
                <TextInput 
                  style={[styles.modalInput, { backgroundColor: '#0f172a', color: '#f8fafc' }]} 
                  placeholder="np. 1234"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  maxLength={6}
                  secureTextEntry
                  value={resetPin}
                  onChangeText={setResetPin}
                />

                <Text style={[styles.inputLabel, { color: '#94a3b8' }]}>Nowe hasło</Text>
                <TextInput 
                  style={[styles.modalInput, { backgroundColor: '#0f172a', color: '#f8fafc' }]} 
                  placeholder="Wpisz nowe hasło (min. 4 znaki)"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={resetNewPassword}
                  onChangeText={setResetNewPassword}
                />

                {resetErrorMessage ? (
                  <View style={{ backgroundColor: '#f87171', padding: 10, borderRadius: 8, marginTop: 10 }}>
                    <Text style={{ color: '#7f1d1d', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
                      ⚠️ {resetErrorMessage}
                    </Text>
                  </View>
                ) : null}

                <View style={[styles.modalActions, { borderTopColor: '#334155' }]}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsResetModalVisible(false)}>
                    <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Anuluj</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.saveBtn, { backgroundColor: '#2563eb' }]} 
                    onPress={handleResetPassword}
                    disabled={resetLoading}
                  >
                    {resetLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Zmień hasło</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={t.isDark ? "light-content" : "dark-content"} backgroundColor={t.bgApp} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: t.bgApp }]} edges={['top', 'left', 'right', 'bottom']}>
        
        {/* ==================== 1. MAGAZYN ==================== */}
        {activeTab === 'inventory' && (
          <View style={[styles.container, { backgroundColor: t.bgContent }]}>
            <View style={[styles.header, { backgroundColor: t.bgApp }]}>
              <View>
                <Text style={[styles.headerTitle, { color: t.textMain }]}>Home Inventory</Text>
                <Text style={[styles.headerSubtitle, { color: t.textSub }]}>
                  {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'produkt' : 'produktów'}[cite: 2]
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity style={styles.addButton} onPress={() => handleOpenAddModal()}>
                  <Text style={styles.addButtonText}>+ Dodaj</Text>
                </TouchableOpacity>
              </View>
            </View>

            {urgentItemsCount > 0 ? (
              <TouchableOpacity style={styles.urgentBanner} onPress={handleFilterUrgentFromWidget}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.urgentBannerTitle}>{urgentItemsCount} wymaga uwagi!</Text>
                  <Text style={styles.urgentBannerSub}>
                    {expiredCount > 0 ? `☠️ Przeterminowane: ${expiredCount} ` : ''}
                    {warningCount > 0 ? `⏳ Do 7 dni: ${warningCount}` : ''}
                  </Text>
                </View>
                <Text style={styles.urgentBannerAction}>Pokaż ➔</Text>
              </TouchableOpacity>
            ) : null}

            <View style={[styles.searchContainer, { backgroundColor: t.bgCard, borderColor: t.border }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput 
                style={[styles.searchInput, { color: t.textMain }]} 
                placeholder="Szukaj produktu, szafki, regału..." 
                placeholderTextColor={t.emptyText} 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
              />
            </View>

            <View style={[styles.categoriesWrapper, { backgroundColor: t.bgApp, borderBottomColor: t.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                {availableRooms.map((room) => (
                  <TouchableOpacity 
                    key={room} 
                    style={[styles.categoryBadge, { backgroundColor: t.bgInput }, selectedRoomFilter === room && styles.categoryBadgeActive]} 
                    onPress={() => setSelectedRoomFilter(room)}
                  >
                    <Text style={[styles.categoryText, { color: t.textSub }, selectedRoomFilter === room && styles.categoryTextActive]}>
                      📍 {room}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.expiryFiltersContainer}>
                {expiryFilters.map((filter) => {
                  const isSelected = selectedExpiryFilters.includes(filter);
                  return (
                    <TouchableOpacity 
                      key={filter} 
                      style={[styles.expiryFilterBadge, { backgroundColor: t.bgInput, borderColor: t.border }, isSelected && (t.isDark ? styles.expiryFilterBadgeActiveDark : styles.expiryFilterBadgeActive)]} 
                      onPress={() => toggleExpiryFilter(filter)}
                    >
                      <Text style={[styles.expiryFilterText, { color: t.textSub }, isSelected && styles.expiryFilterTextActive]}>
                        {filter} {isSelected && filter !== 'Wszystkie daty' ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#1877f2" style={{ marginTop: 40 }} />
            ) : inventoryViewMode === 'list' ? (
              <FlatList
                data={filteredAndSortedItems}
                keyExtractor={(item, index) => item.id || `${item.barcode || 'item'}-${index}`}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: t.emptyText }]}>Brak produktów w wybranej lokalizacji.</Text>
                  </View>
                }
                renderItem={({ item }) => renderItemCard(item)}
              />
            ) : (
              <ScrollView contentContainerStyle={styles.listContainer}>
                {Object.keys(locationTree).map((roomName) => {
                  const roomData = locationTree[roomName];
                  const isRoomOpen = expandedNodes[roomName] ?? true;

                  return (
                    <View key={roomName} style={[styles.treeRoomCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                      <TouchableOpacity style={[styles.treeRoomHeader, { backgroundColor: t.bgInput, borderBottomColor: t.border }]} onPress={() => toggleTreeNode(roomName)}>
                        <Text style={styles.treeRoomIcon}>{isRoomOpen ? '📂' : '📁'}</Text>
                        <Text style={[styles.treeRoomTitle, { color: t.textMain }]}>{roomName}</Text>
                        <View style={styles.treeCountBadge}>
                          <Text style={styles.treeCountBadgeText}>{roomData.count} poz.</Text>
                        </View>
                        <Text style={[styles.treeChevron, { color: t.textSub }]}>{isRoomOpen ? '▲' : '▼'}</Text>
                      </TouchableOpacity>

                      {isRoomOpen && (
                        <View style={[styles.treeRoomBody, { backgroundColor: t.bgContent }]}>
                          {Object.keys(roomData.furnitures).map((furnName) => {
                            const furnData = roomData.furnitures[furnName];
                            const furnKey = `${roomName}>${furnName}`;
                            const isFurnOpen = expandedNodes[furnKey] ?? true;

                            return (
                              <View key={furnKey} style={[styles.treeFurnCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                                <TouchableOpacity style={[styles.treeFurnHeader, { backgroundColor: t.bgInput, borderBottomColor: t.border }]} onPress={() => toggleTreeNode(furnKey)}>
                                  <Text style={styles.treeFurnIcon}>{isFurnOpen ? '🗄️' : '📦'}</Text>
                                  <Text style={[styles.treeFurnTitle, { color: t.textMain }]}>{furnName}</Text>
                                  <View style={[styles.treeCountBadgeSub, { backgroundColor: t.bgContent }]}>
                                    <Text style={[styles.treeCountBadgeTextSub, { color: t.textSub }]}>{furnData.count}</Text>
                                  </View>
                                  <Text style={[styles.treeChevronSub, { color: t.textSub }]}>{isFurnOpen ? '▲' : '▼'}</Text>
                                </TouchableOpacity>

                                {isFurnOpen && (
                                  <View style={styles.treeFurnBody}>
                                    {Object.keys(furnData.spots).map((spotName) => {
                                      const spotItems = furnData.spots[spotName];
                                      const spotKey = `${roomName}>${furnName}>${spotName}`;
                                      const isSpotOpen = expandedNodes[spotKey] ?? true;

                                      return (
                                        <View key={spotKey} style={styles.treeSpotContainer}>
                                          <TouchableOpacity style={[styles.treeSpotHeader, { borderBottomColor: t.border }]} onPress={() => toggleTreeNode(spotKey)}>
                                            <Text style={styles.treeSpotIcon}>🏷️</Text>
                                            <Text style={styles.treeSpotTitle}>{spotName}</Text>
                                            <Text style={[styles.treeSpotCount, { color: t.textSub }]}>({spotItems.length})</Text>
                                            <Text style={styles.treeChevronSpot}>{isSpotOpen ? '▾' : '▸'}</Text>
                                          </TouchableOpacity>

                                          {isSpotOpen && (
                                            <View style={styles.treeItemsList}>
                                              {spotItems.map(item => renderItemCard(item))}
                                            </View>
                                          )}
                                        </View>
                                      );
                                    })}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* ==================== 2. MAPA SIATKOWA ==================== */}
        {activeTab === 'map' && (
          <View style={[styles.container, { backgroundColor: t.bgContent }]}>
            <View style={[styles.header, { backgroundColor: t.bgApp }]}>
              <View>
                <Text style={[styles.headerTitle, { color: t.textMain }]}>Siatka Mieszkania</Text>
                <Text style={[styles.headerSubtitle, { color: t.textSub }]}>
                  {insideRoom ? `Wnętrze: ${insideRoom}` : (isGridEditorMode ? `Rozmiar: ${gridRows}×${gridCols} (Tryb malowania)` : 'Przytrzymaj pokój by edytować, kliknij by wejść')}
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.editPlanBtn, isGridEditorMode && styles.editPlanBtnActive]} 
                onPress={handleToggleEditorMode}
              >
                <Text style={[styles.editPlanBtnText, isGridEditorMode && styles.editPlanBtnTextActive]}>
                  {isGridEditorMode ? 'Zakończ ✓' : '🛠️ Edytuj plan'}
                </Text>
              </TouchableOpacity>
            </View>

            {!insideRoom && (
              <>
                {!isGridEditorMode && (
                  <View style={[styles.searchContainer, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                    <Text style={styles.searchIcon}>📍</Text>
                    <TextInput 
                      style={[styles.searchInput, { color: t.textMain }]} 
                      placeholder="Gdzie leży...? (np. długopis, mleko)" 
                      placeholderTextColor={t.emptyText} 
                      value={mapSearchQuery} 
                      onChangeText={setMapSearchQuery} 
                    />
                    {mapSearchQuery ? (
                      <TouchableOpacity onPress={() => setMapSearchQuery('')}>
                        <Text style={{ fontSize: 16, color: t.textSub }}>✕</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}

                <ScrollView contentContainerStyle={styles.svgScrollContainer}>
                  {isGridEditorMode && (
                    <View style={[styles.dimensionManagerCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                      <Text style={[styles.dimensionManagerTitle, { color: t.textMain }]}>📐 Dopasuj proporcje mieszkania:</Text>
                       
                      <View style={styles.dimensionControlsRow}>
                        <View style={styles.dimControlGroup}>
                          <Text style={[styles.dimLabel, { color: t.textSub }]}>Wysokość ({gridRows}):</Text>
                          <View style={styles.dimBtnGroup}>
                            <TouchableOpacity style={[styles.dimBtn, { backgroundColor: t.bgInput, borderColor: t.border }]} onPress={() => handleChangeGridDimension('rows', -1)}>
                              <Text style={[styles.dimBtnText, { color: t.textMain }]}>−</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.dimBtn, { backgroundColor: t.bgInput, borderColor: t.border }]} onPress={() => handleChangeGridDimension('rows', 1)}>
                              <Text style={[styles.dimBtnText, { color: t.textMain }]}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.dimControlGroup}>
                          <Text style={[styles.dimLabel, { color: t.textSub }]}>Szerokość ({gridCols}):</Text>
                          <View style={styles.dimBtnGroup}>
                            <TouchableOpacity style={[styles.dimBtn, { backgroundColor: t.bgInput, borderColor: t.border }]} onPress={() => handleChangeGridDimension('cols', -1)}>
                              <Text style={[styles.dimBtnText, { color: t.textMain }]}>−</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.dimBtn, { backgroundColor: t.bgInput, borderColor: t.border }]} onPress={() => handleChangeGridDimension('cols', 1)}>
                              <Text style={[styles.dimBtnText, { color: t.textMain }]}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <TouchableOpacity style={styles.clearGridBtn} onPress={handleClearWholeGrid}>
                          <Text style={styles.clearGridBtnText}>Czyść 🧹</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={[styles.gridBoardWrapper, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                    <View style={[styles.gridBoard, { position: 'relative' }]} {...gridPanResponder.panHandlers}>
                      {Array.from({ length: gridRows }).map((_, r) => (
                        <View key={`row-${r}`} style={styles.gridRow}>
                          {Array.from({ length: gridCols }).map((_, c) => {
                            const cellKey = `${r}-${c}`;
                            const roomId = gridCells[cellKey];
                            const roomDef = roomDefs.find(rd => rd.id === roomId);

                            const roomItems = roomDef ? inStockItems.filter(i => parseLocationHierarchy(i.location).room === roomDef.name) : [];
                            const isMatch = mapSearchQuery.trim() !== '' && roomItems.some(i =>
                              (i.name || '').toLowerCase().includes(mapSearchQuery.toLowerCase())
                            );

                            const isSelected = selectedRoomOnMap === roomDef?.name && !isGridEditorMode;
                             
                            const topSame = r > 0 && gridCells[`${r-1}-${c}`] === roomId;
                            const bottomSame = r < gridRows - 1 && gridCells[`${r+1}-${c}`] === roomId;
                            const leftSame = c > 0 && gridCells[`${r}-${c-1}`] === roomId;
                            const rightSame = c < gridCols - 1 && gridCells[`${r}-${c+1}`] === roomId;

                            const isBorderCell = roomDef && (!topSame || !bottomSame || !leftSame || !rightSame);

                            return (
                              <TouchableOpacity
                                key={cellKey}
                                activeOpacity={0.6}
                                style={[
                                  styles.gridCell,
                                  {
                                    width: dynamicCellSize,
                                    height: dynamicCellSize,
                                    backgroundColor: roomDef ? (isMatch ? '#28a745' : roomDef.color) : (t.isDark ? '#1e293b' : '#f8f9fa'),
                                    borderColor: roomDef ? (isMatch ? '#155724' : (isSelected ? (roomDef.border || '#3b82f6') : roomDef.border)) : (t.isDark ? '#334155' : '#e9ecef'),
                                    borderTopWidth: topSame && !isGridEditorMode ? 0.3 : 1,
                                    borderBottomWidth: bottomSame && !isGridEditorMode ? 0.3 : 1,
                                    borderLeftWidth: leftSame && !isGridEditorMode ? 0.3 : 1,
                                    borderRightWidth: rightSame && !isGridEditorMode ? 0.3 : 1,
                                  },
                                  isSelected && isBorderCell && {
                                    shadowColor: roomDef.border || '#3b82f6',
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.9,
                                    shadowRadius: 6,
                                    elevation: 10,
                                    zIndex: 2,
                                  },
                                  isMatch && styles.gridCellMatched
                                ]}
                                onPress={() => handleCellClick(r, c)}
                              />
                            );
                          })}
                        </View>
                      ))}

                      {!isGridEditorMode && roomDefs.map(rd => {
                        const bbox = getRoomBoundingBox(rd.id);
                        if (!bbox) return null;
                        return (
                          <View
                            key={`label-${rd.id}`}
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              top: bbox.top,
                              left: bbox.left,
                              width: bbox.width,
                              height: bbox.height,
                              justifyContent: 'center',
                              alignItems: 'center',
                              padding: 4,
                            }}
                          >
                            <Text style={{ fontSize: 16, marginBottom: 2 }}>{rd.icon}</Text>
                            <Text 
                              style={{ 
                                fontSize: 13, 
                                fontWeight: '900', 
                                color: rd.textColor || '#000', 
                                textAlign: 'center',
                                textShadowColor: 'rgba(255, 255, 255, 0.9)',
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 3
                              }} 
                              numberOfLines={1}
                              adjustsFontSizeToFit
                            >
                              {rd.name}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {isGridEditorMode ? (
                    <View style={[styles.paintPaletteCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={[styles.paintPaletteTitle, { color: t.textMain }]}>Pędzle pokoi (przytrzymaj by edytować):</Text>
                        <TouchableOpacity onPress={() => setIsAddRoomDefModalVisible(true)}>
                          <Text style={styles.addRoomDefBtnText}>+ Nowy pokój</Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paintToolsRow}>
                        {roomDefs.map(rd => {
                          const isActive = activePaintTool === rd.id;
                          return (
                            <View 
                              key={rd.id} 
                              style={[
                                styles.paintToolBadgeWrapper,
                                { backgroundColor: rd.color, borderColor: rd.border },
                                isActive && styles.paintToolBadgeActive
                              ]}
                            >
                              <TouchableOpacity 
                                style={styles.paintToolBadgeContent} 
                                onPress={() => setActivePaintTool(rd.id)}
                                onLongPress={() => openEditRoomModal(rd)}
                              >
                                <Text style={{ fontSize: 14 }}>{rd.icon}</Text>
                                <Text style={[styles.paintToolText, { color: rd.textColor }]}>{rd.name}</Text>
                              </TouchableOpacity>

                              <TouchableOpacity 
                                style={styles.deleteRoomFromMapBtn} 
                                onPress={() => handleDeleteWholeRoom(rd)}
                              >
                                <Text style={styles.deleteRoomFromMapBtnText}>🗑️</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}

                        <TouchableOpacity 
                          style={[
                            styles.paintToolBadge,
                            { backgroundColor: t.bgInput, borderColor: t.border },
                            activePaintTool === 'eraser' && styles.paintToolBadgeActive
                          ]} 
                          onPress={() => setActivePaintTool('eraser')}
                        >
                          <Text style={{ fontSize: 14 }}>🧹</Text>
                          <Text style={[styles.paintToolText, { color: t.textSub }]}>Puste pole</Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  ) : (
                    selectedRoomOnMap && (
                      <View style={[styles.furnitureManagerCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                        <View style={[styles.furnitureManagerHeader, { borderBottomColor: t.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.furnitureManagerTitle, { color: t.textMain }]}>🏠 {selectedRoomOnMap}</Text>
                            <Text style={styles.furnitureManagerSub}>
                              {inStockItems.filter(i => parseLocationHierarchy(i.location).room === selectedRoomOnMap).length} pozycji w tym pokoju
                            </Text>
                          </View>
                           
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity 
                              style={{ backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, justifyContent: 'center' }}
                              onPress={() => setInsideRoom(selectedRoomOnMap)}
                            >
                              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12 }}>Wejdź do środka 🚪</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={styles.addSpotBtn} 
                              onPress={() => handleOpenAddModal({ room: selectedRoomOnMap })}
                            >
                              <Text style={styles.addSpotBtnText}>+ Włóż tu</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {(() => {
                          const roomItems = inStockItems.filter(i => parseLocationHierarchy(i.location).room === selectedRoomOnMap);

                          if (roomItems.length === 0) {
                            return (
                              <View style={styles.emptySpotContainer}>
                                <Text style={[styles.emptySpotText, { color: t.emptyText }]}>Ten pokój jest obecnie pusty.</Text>
                              </View>
                            );
                          }

                          return roomItems.map(item => renderItemCard(item));
                        })()}
                      </View>
                    )
                  )}
                </ScrollView>
              </>
            )}

            {insideRoom && (
              <ScrollView contentContainerStyle={styles.svgScrollContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <TouchableOpacity 
                    style={{ backgroundColor: '#64748b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                    onPress={() => { setInsideRoom(null); setSelectedFurnitureOnMap(null); }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>⬅️ Wróć do mieszkania</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.editPlanBtn, isSubGridEditorMode && styles.editPlanBtnActive]} 
                    onPress={() => setIsSubGridEditorMode(!isSubGridEditorMode)}
                  >
                    <Text style={[styles.editPlanBtnText, isSubGridEditorMode && styles.editPlanBtnTextActive]}>
                      {isSubGridEditorMode ? 'Zakończ ✓' : '🛠️ Edytuj układ mebli'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isSubGridEditorMode && (
                  <View style={[styles.dimensionManagerCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                    <Text style={[styles.dimensionManagerTitle, { color: t.textMain }]}>📐 Dopasuj rozmiar wnętrza pokoju:</Text>
                     
                    <View style={styles.dimensionControlsRow}>
                      <View style={styles.dimControlGroup}>
                        <Text style={[styles.dimLabel, { color: t.textSub }]}>Wysokość ({subGridRows}):</Text>
                        <View style={styles.dimBtnGroup}>
                          <TouchableOpacity style={[styles.dimBtn, { backgroundColor: t.bgInput, borderColor: t.border }]} onPress={() => handleChangeSubGridDimension('rows', -1)}>
                            <Text style={[styles.dimBtnText, { color: t.textMain }]}>−</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.dimBtn, { backgroundColor: t.bgInput, borderColor: t.border }]} onPress={() => handleChangeSubGridDimension('rows', 1)}>
                            <Text style={[styles.dimBtnText, { color: t.textMain }]}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.dimControlGroup}>
                        <Text style={[styles.dimLabel, { color: t.textSub }]}>Szerokość ({subGridCols}):</Text>
                        <View style={styles.dimBtnGroup}>
                          <TouchableOpacity style={[styles.dimBtn, { backgroundColor: t.bgInput, borderColor: t.border }]} onPress={() => handleChangeSubGridDimension('cols', -1)}>
                            <Text style={[styles.dimBtnText, { color: t.textMain }]}>−</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.dimBtn, { backgroundColor: t.bgInput, borderColor: t.border }]} onPress={() => handleChangeSubGridDimension('cols', 1)}>
                            <Text style={[styles.dimBtnText, { color: t.textMain }]}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <TouchableOpacity style={styles.clearGridBtn} onPress={handleClearWholeSubGrid}>
                        <Text style={styles.clearGridBtnText}>Czyść 🧹</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={[styles.gridBoardWrapper, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                  <View style={[styles.gridBoard, { position: 'relative' }]} {...subGridPanResponder.panHandlers}>
                    {Array.from({ length: subGridRows }).map((_, r) => (
                      <View key={`sub-row-${r}`} style={styles.gridRow}>
                        {Array.from({ length: subGridCols }).map((_, c) => {
                          const cellKey = `${r}-${c}`;
                          const furnId = subGridCells[cellKey];
                          const currentFurnDefs = subGridDefs[insideRoom] || [];
                          const furnDef = currentFurnDefs.find(fd => fd.id === furnId);

                          const isSelected = selectedFurnitureOnMap === furnDef?.name && !isSubGridEditorMode;
                           
                          const topSame = r > 0 && subGridCells[`${r-1}-${c}`] === furnId;
                          const bottomSame = r < subGridRows - 1 && subGridCells[`${r+1}-${c}`] === furnId;
                          const leftSame = c > 0 && subGridCells[`${r}-${c-1}`] === furnId;
                          const rightSame = c < subGridCols - 1 && subGridCells[`${r}-${c+1}`] === furnId;

                          const isFurnBorder = furnDef && (!topSame || !bottomSame || !leftSame || !rightSame);

                          return (
                            <TouchableOpacity
                              key={cellKey}
                              activeOpacity={0.6}
                              style={[
                                styles.gridCell,
                                {
                                  width: dynamicSubCellSize,
                                  height: dynamicSubCellSize,
                                  backgroundColor: furnDef ? furnDef.color : (t.isDark ? '#1e293b' : '#f8f9fa'),
                                  borderColor: furnDef ? (isSelected ? (furnDef.border || '#3b82f6') : furnDef.border) : (t.isDark ? '#334155' : '#e9ecef'),
                                  borderTopWidth: topSame && !isSubGridEditorMode ? 0.3 : 1,
                                  borderBottomWidth: bottomSame && !isSubGridEditorMode ? 0.3 : 1,
                                  borderLeftWidth: leftSame && !isSubGridEditorMode ? 0.3 : 1,
                                  borderRightWidth: rightSame && !isSubGridEditorMode ? 0.3 : 1,
                                },
                                isSelected && isFurnBorder && {
                                  shadowColor: furnDef.border || '#3b82f6',
                                  shadowOffset: { width: 0, height: 0 },
                                  shadowOpacity: 0.9,
                                  shadowRadius: 6,
                                  elevation: 10,
                                  zIndex: 2,
                                },
                                isSelected && styles.gridCellSelected
                              ]}
                              onPress={() => handleSubCellClick(r, c)}
                            />
                          );
                        })}
                      </View>
                    ))}

                    {!isSubGridEditorMode && (subGridDefs[insideRoom] || []).map(fd => {
                      const bbox = getFurnBoundingBox(fd.id);
                      if (!bbox) return null;
                      return (
                        <View
                          key={`furn-label-${fd.id}`}
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            top: bbox.top,
                            left: bbox.left,
                            width: bbox.width,
                            height: bbox.height,
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 4,
                          }}
                        >
                          <Text style={{ fontSize: 14, marginBottom: 2 }}>{fd.icon}</Text>
                          <Text 
                            style={{ 
                              fontSize: 12, 
                              fontWeight: '900', 
                              color: fd.textColor || '#000', 
                              textAlign: 'center',
                              textShadowColor: 'rgba(255, 255, 255, 0.9)',
                              textShadowOffset: { width: 0, height: 1 },
                              textShadowRadius: 3
                            }} 
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {fd.name}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {isSubGridEditorMode ? (
                  <View style={[styles.paintPaletteCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={[styles.paintPaletteTitle, { color: t.textMain }]}>Meble / Strefy w pokoju:</Text>
                      <TouchableOpacity onPress={() => setIsAddFurnDefModalVisible(true)}>
                        <Text style={styles.addRoomDefBtnText}>+ Nowy mebel</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paintToolsRow}>
                      {(subGridDefs[insideRoom] || []).map(fd => {
                        const isActive = activeSubPaintTool === fd.id;
                        return (
                          <View 
                            key={fd.id} 
                            style={[
                              styles.paintToolBadgeWrapper,
                              { backgroundColor: fd.color, borderColor: fd.border },
                              isActive && styles.paintToolBadgeActive
                            ]}
                          >
                            <TouchableOpacity 
                              style={styles.paintToolBadgeContent} 
                              onPress={() => setActiveSubPaintTool(fd.id)}
                            >
                              <Text style={{ fontSize: 14 }}>{fd.icon}</Text>
                              <Text style={[styles.paintToolText, { color: fd.textColor }]}>{fd.name}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={styles.deleteRoomFromMapBtn} 
                              onPress={() => handleDeleteWholeFurniture(fd)}
                            >
                              <Text style={styles.deleteRoomFromMapBtnText}>🗑️</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}

                      <TouchableOpacity 
                        style={[
                          styles.paintToolBadge,
                          { backgroundColor: t.bgInput, borderColor: t.border },
                          activeSubPaintTool === 'eraser' && styles.paintToolBadgeActive
                        ]} 
                        onPress={() => setActiveSubPaintTool('eraser')}
                      >
                        <Text style={{ fontSize: 14 }}>🧹</Text>
                        <Text style={[styles.paintToolText, { color: t.textSub }]}>Puste pole</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                ) : (
                  selectedFurnitureOnMap && (
                    <View style={[styles.furnitureManagerCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                      <View style={[styles.furnitureManagerHeader, { borderBottomColor: t.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.furnitureManagerTitle, { color: t.textMain }]}>🗄️ {selectedFurnitureOnMap}</Text>
                          <Text style={styles.furnitureManagerSub}>
                            {inStockItems.filter(i => {
                              const loc = parseLocationHierarchy(i.location);
                              return loc.room === insideRoom && loc.furniture === selectedFurnitureOnMap;
                            }).length} pozycji w tej strefie[cite: 2]
                          </Text>
                        </View>
                         
                        <TouchableOpacity 
                          style={styles.addSpotBtn} 
                          onPress={() => handleOpenAddModal({ room: insideRoom, furniture: selectedFurnitureOnMap })}
                        >
                          <Text style={styles.addSpotBtnText}>+ Włóż tu produkt</Text>
                        </TouchableOpacity>
                      </View>

                      {(() => {
                        const furnItems = inStockItems.filter(i => {
                          const loc = parseLocationHierarchy(i.location);
                          return loc.room === insideRoom && loc.furniture === selectedFurnitureOnMap;
                        });

                        if (furnItems.length === 0) {
                          return (
                            <View style={styles.emptySpotContainer}>
                              <Text style={[styles.emptySpotText, { color: t.emptyText }]}>Ten mebel jest pusty.</Text>
                            </View>
                          );
                        }

                        return furnItems.map(item => renderItemCard(item));
                      })()}
                    </View>
                  )
                )}
              </ScrollView>
            )}
          </View>
        )}

        {/* ==================== 3. LISTA ZAKUPÓW ==================== */}
        {activeTab === 'shopping' && (
          <View style={[styles.container, { backgroundColor: t.bgContent }]}>
            <View style={[styles.header, { backgroundColor: t.bgApp }]}>
              <View>
                <Text style={[styles.headerTitle, { color: t.textMain }]}>Lista Zakupów</Text>
                <Text style={styles.shoppingBadgeCount}>{totalShoppingCount} poz.</Text>
              </View>
            </View>

            <View style={[styles.shoppingInputWrapper, { backgroundColor: t.bgApp, borderBottomColor: t.border }]}>
              <TextInput 
                style={[styles.shoppingInput, { backgroundColor: t.bgInput, color: t.textMain }]} 
                placeholder="Dopisz rzecz do kupienia..." 
                placeholderTextColor={t.emptyText} 
                value={newShoppingInput} 
                onChangeText={setNewShoppingInput} 
                onSubmitEditing={handleAddCustomShoppingItem} 
              />
              <TouchableOpacity style={styles.shoppingAddBtn} onPress={handleAddCustomShoppingItem}>
                <Text style={styles.shoppingAddBtnText}>Dodaj</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.listContainer}>
              {outOfStockItems.length > 0 && (
                <View style={styles.shoppingSection}>
                  <Text style={[styles.sectionHeader, { color: t.textSub }]}>⚠️ Kończy się / Brak w domu ({outOfStockItems.length})</Text>
                  {outOfStockItems.map((item) => {
                    const { hasFill, fillLevel } = parseItemNotes(item.notes);
                    const isBought = boughtShoppingItemIds.includes(item.id);
                    const statusText = item.quantity <= 0 
                      ? `Stan: 0 ${item.unit || 'szt'}`
                      : (hasFill && fillLevel <= 25 ? `Ostatnia sztuka (${fillLevel}%)` : `Stan: ${item.quantity} ${item.unit || 'szt'}`);

                    return (
                      <View key={item.id} style={[styles.shoppingCard, { backgroundColor: t.bgCard, borderColor: t.border }, isBought && (t.isDark ? styles.shoppingCardBoughtDark : styles.shoppingCardBought)]}>
                        <TouchableOpacity style={styles.checkboxCircle} onPress={() => toggleBoughtShoppingItem(item.id)}>
                          <Text style={styles.checkboxIcon}>{isBought ? '✅' : '⭕'}</Text>
                        </TouchableOpacity>

                        <View style={{ flex: 1, marginHorizontal: 10 }}>
                          <Text style={[styles.shoppingItemName, { color: t.textMain }, isBought && styles.shoppingItemNameBought]}>{item.name}</Text>
                          <Text style={[styles.shoppingItemSub, { color: t.textSub }]}>📍 {item.location || 'Spiżarnia'} • {statusText}</Text>

                          {isBought && (
                            <TouchableOpacity style={[styles.restockQuickBtn, t.isDark && { backgroundColor: '#1e3a8a', borderColor: '#3b82f6' }]} onPress={() => handleOpenRestockModal(item, false)}>
                              <Text style={[styles.restockQuickBtnText, t.isDark && { color: '#93c5fd' }]}>📥 Odłóż do pokoju na siatce</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <TouchableOpacity 
                          style={[styles.buyStatusBtn, { backgroundColor: t.bgInput, borderColor: t.border }, isBought && styles.buyStatusBtnBought]} 
                          onPress={() => toggleBoughtShoppingItem(item.id)}
                        >
                          <Text style={[styles.buyStatusBtnText, { color: t.textSub }, isBought && styles.buyStatusBtnTextBought]}>
                            {isBought ? 'Kupione ✓' : 'Kupione?'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              {customShoppingItems.length > 0 && (
                <View style={styles.shoppingSection}>
                  <Text style={[styles.sectionHeader, { color: t.textSub }]}>📝 Dopisane do listy ({customShoppingItems.length})</Text>
                  {customShoppingItems.map((item) => {
                    const isBought = boughtShoppingItemIds.includes(item.id);

                    return (
                      <View key={item.id} style={[styles.shoppingCard, { backgroundColor: t.bgCard, borderColor: t.border }, isBought && (t.isDark ? styles.shoppingCardBoughtDark : styles.shoppingCardBought)]}>
                        <TouchableOpacity style={styles.checkboxCircle} onPress={() => toggleBoughtShoppingItem(item.id)}>
                          <Text style={styles.checkboxIcon}>{isBought ? '✅' : '⭕'}</Text>
                        </TouchableOpacity>

                        <View style={{ flex: 1, marginHorizontal: 10 }}>
                          <Text style={[styles.shoppingItemName, { color: t.textMain }, isBought && styles.shoppingItemNameBought]}>{item.name}</Text>
                          {isBought && (
                            <TouchableOpacity style={[styles.restockQuickBtn, t.isDark && { backgroundColor: '#1e3a8a', borderColor: '#3b82f6' }]} onPress={() => handleOpenRestockModal(item, true)}>
                              <Text style={[styles.restockQuickBtnText, t.isDark && { color: '#93c5fd' }]}>📥 Wskaż pokój na siatce</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <TouchableOpacity 
                          style={[styles.buyStatusBtn, { backgroundColor: t.bgInput, borderColor: t.border }, isBought && styles.buyStatusBtnBought]} 
                          onPress={() => toggleBoughtShoppingItem(item.id)}
                        >
                          <Text style={[styles.buyStatusBtnText, { color: t.textSub }, isBought && styles.buyStatusBtnTextBought]}>
                            {isBought ? 'Kupione ✓' : 'Kupione?'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleRemoveCustomShoppingItem(item.id)}>
                          <Text style={styles.deleteIcon}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              {totalShoppingCount === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 40, marginBottom: 10 }}>🎉</Text>
                  <Text style={[styles.emptyTitle, { color: t.textMain }]}>Wszystko masz pod ręką!</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* ==================== 5. USTAWIENIA ==================== */}
        {activeTab === 'settings' && (
          <View style={[styles.container, { backgroundColor: t.bgContent }]}>
            <View style={[styles.header, { backgroundColor: t.bgApp }]}>
              <Text style={[styles.headerTitle, { color: t.textMain }]}>Ustawienia Aplikacji</Text>
            </View>

            <ScrollView contentContainerStyle={styles.listContainer}>
              <View style={[styles.settingsCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <Text style={[styles.settingsCardTitle, { color: t.textMain }]}>🎨 Motyw aplikacji</Text>
                <Text style={[styles.settingsCardSub, { color: t.textSub }]}>Wybierz styl wyglądu (zapisuje się w bazie)</Text>

                <View style={styles.themeOptionsRow}>
                  <TouchableOpacity 
                    style={[styles.themeOptionBtn, { backgroundColor: t.bgInput, borderColor: t.border }, themeMode === 'light' && styles.themeOptionBtnActive]} 
                    onPress={() => handleThemeChange('light')}
                  >
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>☀️</Text>
                    <Text style={[styles.themeOptionText, { color: themeMode === 'light' ? '#1877f2' : t.textSub }]}>Jasny</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.themeOptionBtn, { backgroundColor: t.bgInput, borderColor: t.border }, themeMode === 'dark' && styles.themeOptionBtnActive]} 
                    onPress={() => handleThemeChange('dark')}
                  >
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>🌙</Text>
                    <Text style={[styles.themeOptionText, { color: themeMode === 'dark' ? '#1877f2' : t.textSub }]}>Ciemny</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.settingsCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <Text style={[styles.settingsCardTitle, { color: t.textMain }]}>📋 Domyślny widok w Magazynie</Text>
                <Text style={[styles.settingsCardSub, { color: t.textSub }]}>Jak chcesz przeglądać swoje rzeczy?</Text>

                <View style={styles.themeOptionsRow}>
                  <TouchableOpacity 
                    style={[styles.themeOptionBtn, { backgroundColor: t.bgInput, borderColor: t.border }, inventoryViewMode === 'list' && styles.themeOptionBtnActive]} 
                    onPress={() => handleViewModeChange('list')}
                  >
                    <Text style={{ fontSize: 22, marginBottom: 4 }}>📋</Text>
                    <Text style={[styles.themeOptionText, { color: inventoryViewMode === 'list' ? '#1877f2' : t.textSub }]}>Lista</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.themeOptionBtn, { backgroundColor: t.bgInput, borderColor: t.border }, inventoryViewMode === 'tree' && styles.themeOptionBtnActive]} 
                    onPress={() => handleViewModeChange('tree')}
                  >
                    <Text style={{ fontSize: 22, marginBottom: 4 }}>🗂️</Text>
                    <Text style={[styles.themeOptionText, { color: inventoryViewMode === 'tree' ? '#1877f2' : t.textSub }]}>Drzewo lokalizacji</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.settingsCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <Text style={[styles.settingsCardTitle, { color: t.textMain }]}>Konto i Sesja</Text>
                <TouchableOpacity 
                  style={{ backgroundColor: '#dc3545', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 }}
                  onPress={handleLogout}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>Wyloguj się z konta</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.settingsCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <Text style={[styles.settingsCardTitle, { color: t.textMain }]}>Hubercik Developer</Text>
                <Text style={[styles.settingsCardSub, { color: t.textSub, marginTop: 8, lineHeight: 20 }]}>
                  Autorem tego softu jest Hubercik – człowiek, dla którego bałagan jest stanem naturalnym, a moją główną życiową pasją jest gubienie rzeczy, o których istnieniu zapomniałem minutę po ich odłożeniu. Aplikacja powstała, bo mój mózg z ADHD wygenerował już tyle chaosu, że bez tego systemu prawdopodobnie szukałbym własnej lewej stopy przez trzy dni. Jeśli działa – ciesz się. Jeśli nie działa – cóż, przynajmniej jest estetycznie.[cite: 2]
                </Text>
              </View>
            </ScrollView>
          </View>
        )}

        {/* ==================== 4. SKANER ==================== */}
        {activeTab === 'scanner' && (
          <View style={styles.scannerContainer}>
            {!permission?.granted ? (
              <View style={styles.permissionBox}>
                <Text style={styles.permissionText}>Wymagany dostęp do aparatu.</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                  <Text style={styles.primaryBtnText}>Przyznaj uprawnienia</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "qr"] }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              >
                <View style={styles.scannerOverlay}>
                  <Text style={styles.scannerPrompt}>Skieruj aparat na kod kreskowy EAN</Text>
                  {scanningLoading && <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 15 }} />}
                </View>
              </CameraView>
            )}
          </View>
        )}

        {/* ==================== MODAL DODAWANIA POKOJU ==================== */}
        <Modal visible={isAddRoomDefModalVisible} animationType="slide" transparent={true}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { backgroundColor: t.bgCard }]}>
              <Text style={[styles.modalTitle, { color: t.textMain }]}>Dodaj nowy pokój</Text>
              <Text style={[styles.inputLabel, { color: t.textSub }]}>Nazwa pomieszczenia *</Text>
              <TextInput 
                style={[styles.modalInput, { backgroundColor: t.bgInput, color: t.textMain }]} 
                placeholder="np. Sypialnia, Balkon" 
                placeholderTextColor={t.emptyText}
                value={newRoomDefName} 
                onChangeText={setNewRoomDefName} 
              />
              <Text style={[styles.inputLabel, { color: t.textSub }]}>Wybierz ikonę:</Text>
              <View style={styles.iconGrid}>
                {['🛏️', '🛋️', '🍳', '🥫', '🚿', '🚗', '📦', '🌿', '🖥️', '📚', '🧹', '🚪'].map(icon => (
                  <TouchableOpacity 
                    key={icon} 
                    style={[styles.iconChoice, { backgroundColor: t.bgInput, borderColor: t.border }, newRoomDefIcon === icon && styles.iconChoiceActive]} 
                    onPress={() => setNewRoomDefIcon(icon)}
                  >
                    <Text style={{ fontSize: 20 }}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.modalActions, { borderTopColor: t.border }]}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAddRoomDefModalVisible(false)}>
                  <Text style={[styles.cancelBtnText, { color: t.textSub }]}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAddNewRoomDef}>
                  <Text style={styles.saveBtnText}>Dodaj do pędzli</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ==================== MODAL EDYCJI POKOJU ==================== */}
        <Modal visible={isEditRoomModalVisible} animationType="slide" transparent={true}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { backgroundColor: t.bgCard }]}>
              <Text style={[styles.modalTitle, { color: t.textMain }]}>Edytuj pokój: {roomToEdit?.name}</Text>
              <Text style={[styles.inputLabel, { color: t.textSub }]}>Nowa nazwa:</Text>
              <TextInput 
                style={[styles.modalInput, { backgroundColor: t.bgInput, color: t.textMain }]} 
                value={newRoomDefName} 
                onChangeText={setNewRoomDefName} 
              />
              <Text style={[styles.inputLabel, { color: t.textSub }]}>Wybierz kolor z palety:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 }}>
                {PREDEFINED_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: color,
                      borderWidth: roomToEdit?.color === color ? 3 : 1,
                      borderColor: roomToEdit?.color === color ? '#1877f2' : '#ced4da'
                    }}
                    onPress={() => setRoomToEdit(prev => ({ ...prev, color }))}
                  />
                ))}
              </View>
              <View style={[styles.modalActions, { borderTopColor: t.border }]}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditRoomModalVisible(false)}>
                  <Text style={[styles.cancelBtnText, { color: t.textSub }]}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEditedRoom}>
                  <Text style={styles.saveBtnText}>Zapisz zmiany</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ==================== MODAL DODAWANIA MEBLA ==================== */}
        <Modal visible={isAddFurnDefModalVisible} animationType="slide" transparent={true}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { backgroundColor: t.bgCard }]}>
              <Text style={[styles.modalTitle, { color: t.textMain }]}>Dodaj nowy mebel / strefę</Text>
              <Text style={[styles.inputLabel, { color: t.textSub }]}>Nazwa mebla *</Text>
              <TextInput 
                style={[styles.modalInput, { backgroundColor: t.bgInput, color: t.textMain }]} 
                placeholder="np. Szafka wisząca, Piekarnik" 
                placeholderTextColor={t.emptyText}
                value={newFurnDefName} 
                onChangeText={setNewFurnDefName} 
              />
              <Text style={[styles.inputLabel, { color: t.textSub }]}>Wybierz ikonę:</Text>
              <View style={styles.iconGrid}>
                {['🗄️', '🧊', '🚰', '📦', '🍽️', '🧺', '🪵', '🔥'].map(icon => (
                  <TouchableOpacity 
                    key={icon} 
                    style={[styles.iconChoice, { backgroundColor: t.bgInput, borderColor: t.border }, newFurnDefIcon === icon && styles.iconChoiceActive]} 
                    onPress={() => setNewFurnDefIcon(icon)}
                  >
                    <Text style={{ fontSize: 20 }}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.modalActions, { borderTopColor: t.border }]}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAddFurnDefModalVisible(false)}>
                  <Text style={[styles.cancelBtnText, { color: t.textSub }]}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAddNewFurnDef}>
                  <Text style={styles.saveBtnText}>Dodaj mebel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ==================== MODAL FORMULARZA PRODUKTU ==================== */}
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { backgroundColor: t.bgCard }]}>
              <Text style={[styles.modalTitle, { color: t.textMain }]}>{isEditing ? 'Edytuj / Odłóż produkt' : 'Nowy produkt'}</Text>
               
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.inputLabel, { color: t.textSub }]}>Nazwa produktu *</Text>
                <TextInput style={[styles.modalInput, { backgroundColor: t.bgInput, color: t.textMain }]} placeholder="np. Długopis żelowy / Mleko 3.2%" placeholderTextColor={t.emptyText} value={formName} onChangeText={setFormName} />

                <Text style={[styles.inputLabel, { color: t.textSub }]}>Marka</Text>
                <TextInput style={[styles.modalInput, { backgroundColor: t.bgInput, color: t.textMain }]} placeholder="np. Pilot / Piątnica" placeholderTextColor={t.emptyText} value={formBrand} onChangeText={setFormBrand} />

                <View style={[styles.roomSelectContainer, { backgroundColor: t.bgInput, borderColor: t.border }]}>
                  <Text style={styles.inputSectionTitle}>📍 1. Wskaż pokój dla produktu * (Wymagane)</Text>
                   
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomPillsRow}>
                    {roomDefs.map(rd => {
                      const isSelected = formRoom === rd.name;
                      return (
                        <TouchableOpacity
                          key={rd.id}
                          style={[
                            styles.roomSelectPill,
                            { backgroundColor: isSelected ? '#1877f2' : rd.color, borderColor: isSelected ? '#0d6efd' : rd.border }
                          ]}
                          onPress={() => setFormRoom(rd.name)}
                        >
                          <Text style={{ fontSize: 13 }}>{rd.icon}</Text>
                          <Text style={[styles.roomSelectPillText, isSelected && { color: '#ffffff', fontWeight: '800' }]}>
                            {rd.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <Text style={[styles.optionalHeader, { color: t.textSub }]}>Opcjonalne szczegóły wnętrza:</Text>
                <View style={styles.formRow}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={[styles.inputLabelSmall, { color: t.textSub }]}>Mebel / Strefa</Text>
                    <TextInput style={[styles.modalInputSmall, { backgroundColor: t.bgInput, color: t.textMain }]} placeholder="np. Zlew / Lodówka" placeholderTextColor={t.emptyText} value={formFurniture} onChangeText={setFormFurniture} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={[styles.inputLabelSmall, { color: t.textSub }]}>Półka / Pudełko</Text>
                    <TextInput style={[styles.modalInputSmall, { backgroundColor: t.bgInput, color: t.textMain }]} placeholder="np. Półka 1" placeholderTextColor={t.emptyText} value={formSpot} onChangeText={setFormSpot} />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.inputLabel, { color: t.textSub }]}>Liczba opakowań/sztuk *</Text>
                    <TextInput style={[styles.modalInput, { backgroundColor: t.bgInput, color: t.textMain }]} placeholder="1" placeholderTextColor={t.emptyText} keyboardType="numeric" value={formQuantity} onChangeText={setFormQuantity} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.inputLabel, { color: t.textSub }]}>Jednostka</Text>
                    <TextInput style={[styles.modalInput, { backgroundColor: t.bgInput, color: t.textMain }]} placeholder="szt / butelka / rolka" placeholderTextColor={t.emptyText} value={formUnit} onChangeText={setFormUnit} />
                  </View>
                </View>

                <View style={[styles.trackingToggleContainer, { backgroundColor: t.bgInput }]}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.trackingToggleTitle, { color: t.textMain }]}>Śledź stan otwartego opakowania (%)</Text>
                    <Text style={[styles.trackingToggleSub, { color: t.textSub }]}>Włącz dla płynów, chemii, rolek itp.</Text>
                  </View>
                  <Switch value={formHasFillLevel} onValueChange={setFormHasFillLevel} trackColor={{ false: t.border, true: '#1877f2' }} />
                </View>

                {formHasFillLevel ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.inputLabel, { color: t.textSub }]}>Aktualny poziom:</Text>
                    <View style={styles.fillPicker}>
                      {fillLevels.map((lvl) => (
                        <TouchableOpacity 
                          key={lvl} 
                          style={[styles.fillPickerBtn, { backgroundColor: t.bgInput, borderColor: t.border }, formFillLevel === lvl && styles.fillPickerBtnActive]} 
                          onPress={() => setFormFillLevel(lvl)}
                        >
                          <Text style={[styles.fillPickerText, { color: t.textSub }, formFillLevel === lvl && styles.fillPickerTextActive]}>
                            {lvl === 0 ? 'Zużyte (0%)' : `${lvl}%`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : null}

                <Text style={[styles.inputLabel, { color: t.textSub }]}>Kategoria</Text>
                <TextInput style={[styles.modalInput, { backgroundColor: t.bgInput, color: t.textMain }]} placeholder="np. Biurowe, Narzędzia, Chemia" placeholderTextColor={t.emptyText} value={formCategory} onChangeText={setFormCategory} />

                <Text style={[styles.inputLabel, { color: t.textSub }]}>Data ważności (opcjonalnie)</Text>
                <TextInput style={[styles.modalInput, { backgroundColor: t.bgInput, color: t.textMain }]} placeholder="RRRR-MM-DD" placeholderTextColor={t.emptyText} value={formExpiry} onChangeText={setFormExpiry} />
              </ScrollView>

              <View style={[styles.modalActions, { borderTopColor: t.border }]}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.cancelBtnText, { color: t.textSub }]}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveBtn, !isFormValid && styles.saveBtnDisabled]} 
                  disabled={!isFormValid} 
                  onPress={handleSaveItem}
                >
                  <Text style={[styles.saveBtnText, !isFormValid && styles.saveBtnTextDisabled]}>
                    {isFormValid ? 'Zapisz w magazynie' : 'Wskaż pokój na planie ➔'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ==================== DOLNA NAWIGACJA ==================== */}
        <View style={[styles.bottomNav, { backgroundColor: t.navBg, borderTopColor: t.navBorder }]}>
          <TouchableOpacity 
            style={[styles.navTab, { backgroundColor: t.navTabMagazyn, borderRightColor: t.navBorder }, activeTab === 'inventory' && [styles.navTabActive, { borderTopColor: '#2563eb', backgroundColor: t.activeTabMagazynBg }]]} 
            onPress={() => setActiveTab('inventory')}
          >
            <Text style={[styles.navTabText, { color: t.navText }, activeTab === 'inventory' && [styles.navTabTextActive, { color: t.isDark ? '#93c5fd' : '#2563eb' }]]}>
              Magazyn
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navTab, { backgroundColor: t.navTabSiatka, borderRightColor: t.navBorder }, activeTab === 'map' && [styles.navTabActive, { borderTopColor: '#059669', backgroundColor: t.activeTabSiatkaBg }]]} 
            onPress={() => setActiveTab('map')}
          >
            <Text style={[styles.navTabText, { color: t.navText }, activeTab === 'map' && [styles.navTabTextActive, { color: t.isDark ? '#6ee7b7' : '#059669' }]]}>
              Siatka
            </Text>
          </TouchableOpacity>
           
          <TouchableOpacity 
            style={[styles.navTab, { backgroundColor: t.navTabZakupy, borderRightColor: t.navBorder }, activeTab === 'shopping' && [styles.navTabActive, { borderTopColor: '#d97706', backgroundColor: t.activeTabZakupyBg }]]} 
            onPress={() => setActiveTab('shopping')}
          >
            <Text style={[styles.navTabText, { color: t.navText }, activeTab === 'shopping' && [styles.navTabTextActive, { color: t.isDark ? '#fcd34d' : '#d97706' }]]}>
              Zakupy{totalShoppingCount > 0 ? ` (${totalShoppingCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navTab, { backgroundColor: t.navTabUstawienia, borderRightColor: t.navBorder }, activeTab === 'settings' && [styles.navTabActive, { borderTopColor: '#9333ea', backgroundColor: t.activeTabUstawieniaBg }]]} 
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[styles.navTabText, { color: t.navText }, activeTab === 'settings' && [styles.navTabTextActive, { color: t.isDark ? '#d8b4fe' : '#9333ea' }]]}>
              Ustawienia
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navTab, { backgroundColor: t.navTabSkaner }, activeTab === 'scanner' && [styles.navTabActive, { borderTopColor: '#7c3aed', backgroundColor: t.activeTabSkanerBg }]]} 
            onPress={() => setActiveTab('scanner')}
          >
            <Text style={[styles.navTabText, { color: t.navText }, activeTab === 'scanner' && [styles.navTabTextActive, { color: t.isDark ? '#c4b5fd' : '#7c3aed' }]]}>
              Skaner
            </Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  addButton: { backgroundColor: '#1877f2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  editPlanBtn: { backgroundColor: '#e7f3ff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#b8daff' },
  editPlanBtnActive: { backgroundColor: '#28a745', borderColor: '#28a745' },
  editPlanBtnText: { color: '#1877f2', fontWeight: '700', fontSize: 13 },
  editPlanBtnTextActive: { color: '#ffffff' },
  urgentBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff3cd', marginHorizontal: 16, marginTop: 6, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ffeeba' },
  urgentBannerTitle: { fontSize: 13, fontWeight: '800', color: '#856404' },
  urgentBannerSub: { fontSize: 11, color: '#856404', marginTop: 2 },
  urgentBannerAction: { fontSize: 12, fontWeight: '800', color: '#856404', marginLeft: 8 },

  svgScrollContainer: { padding: 16, paddingBottom: 40 },
  dimensionManagerCard: { borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 10 },
  dimensionManagerTitle: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  dimensionControlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  dimControlGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dimLabel: { fontSize: 11, fontWeight: '600' },
  dimBtnGroup: { flexDirection: 'row', gap: 2 },
  dimBtn: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dimBtnText: { fontSize: 14, fontWeight: '800' },
  clearGridBtn: { backgroundColor: '#ffe3e3', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#ffa8a8' },
  clearGridBtnText: { fontSize: 11, color: '#e03131', fontWeight: '700' },

  gridBoardWrapper: { alignItems: 'center', borderRadius: 16, padding: GRID_CONTAINER_PADDING, borderWidth: 2, elevation: 2 },
  gridBoard: { flexDirection: 'column' },
  gridRow: { flexDirection: 'row' },
  gridCell: { borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  gridCellSelected: { borderWidth: 2, borderColor: '#1877f2' },
  gridCellMatched: { borderWidth: 2, borderColor: '#155724' },

  paintPaletteCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 14 },
  paintPaletteTitle: { fontSize: 12, fontWeight: '700' },
  addRoomDefBtnText: { color: '#1877f2', fontWeight: '700', fontSize: 12 },
  paintToolsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  paintToolBadgeWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1.5, overflow: 'hidden' },
  paintToolBadgeContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  deleteRoomFromMapBtn: { paddingHorizontal: 6, paddingVertical: 6, backgroundColor: 'rgba(220, 53, 69, 0.15)', borderLeftWidth: 1, borderLeftColor: 'rgba(220, 53, 69, 0.2)' },
  deleteRoomFromMapBtnText: { fontSize: 11 },
  paintToolBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, gap: 4 },
  paintToolBadgeActive: { borderWidth: 2.5, borderColor: '#1877f2', elevation: 2 },
  paintToolText: { fontSize: 12, fontWeight: '700' },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 },
  iconChoice: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  iconChoiceActive: { backgroundColor: '#e7f3ff', borderColor: '#1877f2', borderWidth: 2 },

  furnitureManagerCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 16, elevation: 2 },
  furnitureManagerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, marginBottom: 10 },
  furnitureManagerTitle: { fontSize: 16, fontWeight: '800' },
  furnitureManagerSub: { fontSize: 12, color: '#1877f2', fontWeight: '700', marginTop: 2 },
  addSpotBtn: { backgroundColor: '#1877f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addSpotBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  emptySpotContainer: { paddingVertical: 20, alignItems: 'center' },
  emptySpotText: { fontSize: 13, marginBottom: 10 },

  roomSelectContainer: { borderRadius: 12, padding: 12, borderWidth: 1, marginTop: 14, marginBottom: 10 },
  roomPillsRow: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  roomSelectPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, gap: 4 },
  roomSelectPillText: { fontSize: 12, fontWeight: '600', color: '#495057' },
  optionalHeader: { fontSize: 12, fontWeight: '700', marginTop: 6, marginBottom: 4 },
  inputLabelSmall: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  modalInputSmall: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },

  shoppingBadgeCount: { backgroundColor: '#e7f3ff', color: '#1877f2', fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 13 },
  shoppingInputWrapper: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  shoppingInput: { flex: 1, height: 42, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  shoppingAddBtn: { backgroundColor: '#1877f2', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 },
  shoppingAddBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  shoppingSection: { marginBottom: 20 },
  sectionHeader: { fontSize: 14, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  shoppingCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  shoppingCardBought: { backgroundColor: '#f0f9f2', borderColor: '#c3e6cb' },
  shoppingCardBoughtDark: { backgroundColor: '#064e3b', borderColor: '#059669' },
  checkboxCircle: { padding: 2 },
  checkboxIcon: { fontSize: 20 },
  shoppingItemName: { fontSize: 15, fontWeight: '700' },
  shoppingItemNameBought: { textDecorationLine: 'line-through', opacity: 0.6 },
  shoppingItemSub: { fontSize: 12, marginTop: 2 },
  buyStatusBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  buyStatusBtnBought: { backgroundColor: '#d4edda', borderColor: '#c3e6cb' },
  buyStatusBtnText: { fontSize: 12, fontWeight: '700' },
  buyStatusBtnTextBought: { color: '#155724' },
  restockQuickBtn: { backgroundColor: '#e7f3ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginTop: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#b8daff' },
  restockQuickBtnText: { fontSize: 12, color: '#1877f2', fontWeight: '700' },

  settingsCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  settingsCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  settingsCardSub: { fontSize: 13 },
  themeOptionsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  themeOptionBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center', backgroundColor: 'transparent' },
  themeOptionBtnActive: { borderColor: '#1877f2', borderWidth: 2, backgroundColor: '#e7f3ff' },
  themeOptionText: { fontSize: 13, fontWeight: '700' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  searchIcon: { marginRight: 8, fontSize: 14 },
  searchInput: { flex: 1, height: 40, fontSize: 14 },
  categoriesWrapper: { paddingBottom: 8, borderBottomWidth: 1 },
  categoriesContainer: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  categoryBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 6 },
  categoryBadgeActive: { backgroundColor: '#1877f2' },
  categoryText: { fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#ffffff' },
  expiryFiltersContainer: { paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  expiryFilterBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1, marginRight: 6 },
  expiryFilterBadgeActive: { backgroundColor: '#333333', borderColor: '#333333' },
  expiryFilterBadgeActiveDark: { backgroundColor: '#60a5fa', borderColor: '#60a5fa' },
  expiryFilterText: { fontSize: 12, fontWeight: '600' },
  expiryFilterTextActive: { color: '#ffffff' },
  listContainer: { padding: 16, gap: 10 },
  emptyContainer: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  card: { borderRadius: 12, padding: 14, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, marginBottom: 8 },
  cardHighlightNew: { borderColor: '#1877f2', borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  itemThumbnail: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#f0f2f5' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, marginTop: 2 },
  newBadge: { backgroundColor: '#e7f3ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#1877f2' },
  newBadgeText: { fontSize: 10, fontWeight: '800', color: '#1877f2' },
  cardActions: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  iconBtn: { padding: 4 },
  deleteIcon: { fontSize: 16, color: '#8e8e93', fontWeight: '700' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tagLocationHierarchy: { backgroundColor: '#e7f3ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#b8daff' },
  tagLocationHierarchyText: { fontSize: 12, color: '#1877f2', fontWeight: '700' },
  tagCategory: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 12 },
  expiryBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, marginTop: 8 },
  expiryBadgeText: { fontSize: 12, fontWeight: '700' },
  fillLevelSection: { marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
  fillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  fillLabel: { fontSize: 12, fontWeight: '600' },
  fillValue: { fontSize: 12, fontWeight: '800' },
  progressBarBackground: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  fillBtnRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  fillMiniBtn: { flex: 1, paddingVertical: 4, alignItems: 'center', borderRadius: 6, borderWidth: 1 },
  fillMiniBtnActive: { backgroundColor: '#1877f2', borderColor: '#1877f2' },
  fillMiniBtnText: { fontSize: 11, fontWeight: '600' },
  fillMiniBtnTextActive: { color: '#ffffff', fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
  quantityDisplay: { flexDirection: 'row', alignItems: 'baseline' },
  quantityNumber: { fontSize: 20, fontWeight: '800' },
  quantityUnit: { fontSize: 14, fontWeight: '600' },
  extraStockBadge: { fontSize: 12, color: '#1877f2', fontWeight: '700' },
  counterControls: { flexDirection: 'row', gap: 8 },
  counterBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { fontSize: 18, fontWeight: '700' },

  treeRoomCard: { borderRadius: 12, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
  treeRoomHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  treeRoomIcon: { fontSize: 18, marginRight: 8 },
  treeRoomTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  treeCountBadge: { backgroundColor: '#1877f2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 8 },
  treeCountBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  treeChevron: { fontSize: 12 },
  treeRoomBody: { padding: 10 },
  treeFurnCard: { borderRadius: 10, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  treeFurnHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1 },
  treeFurnIcon: { fontSize: 15, marginRight: 6 },
  treeFurnTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  treeCountBadgeSub: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginRight: 6 },
  treeCountBadgeTextSub: { fontSize: 11, fontWeight: '700' },
  treeChevronSub: { fontSize: 10 },
  treeFurnBody: { padding: 8 },
  treeSpotContainer: { marginBottom: 8 },
  treeSpotHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1 },
  treeSpotIcon: { fontSize: 13, marginRight: 4 },
  treeSpotTitle: { fontSize: 13, fontWeight: '700', color: '#1877f2' },
  treeSpotCount: { fontSize: 12, marginLeft: 4, flex: 1 },
  treeChevronSpot: { fontSize: 12, color: '#8e8e93' },
  treeItemsList: { paddingTop: 6, paddingLeft: 4 },

  scannerContainer: { flex: 1, backgroundColor: '#000000' },
  scannerOverlay: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.75)', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  scannerPrompt: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionText: { fontSize: 15, marginBottom: 12, color: '#ffffff' },
  primaryBtn: { backgroundColor: '#1877f2', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: '#ffffff', fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  inputSectionTitle: { fontSize: 14, fontWeight: '800', color: '#1877f2', marginBottom: 4 },
  inputLabel: { fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  modalInput: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  formRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trackingToggleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, marginTop: 14, marginBottom: 4 },
  trackingToggleTitle: { fontSize: 14, fontWeight: '700' },
  trackingToggleSub: { fontSize: 12, marginTop: 2 },
  fillPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  fillPickerBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  fillPickerBtnActive: { backgroundColor: '#1877f2', borderColor: '#1877f2' },
  fillPickerText: { fontSize: 12 },
  fillPickerTextActive: { color: '#ffffff', fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20, paddingTop: 12, borderTopWidth: 1 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  cancelBtnText: { fontWeight: '600' },
  saveBtn: { backgroundColor: '#1877f2', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveBtnDisabled: { backgroundColor: '#e4e6eb' },
  saveBtnText: { color: '#ffffff', fontWeight: '700' },
  saveBtnTextDisabled: { color: '#8e8e93' },

  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  navTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderTopWidth: 3,
    borderTopColor: 'transparent',
  },
  navTabActive: {
    borderTopWidth: 3,
  },
  navTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  navTabTextActive: {
    fontWeight: '800',
  }
});