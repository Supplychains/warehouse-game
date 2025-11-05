import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Truck, Package, Clock, DollarSign, Trophy, RotateCw } from 'lucide-react';

const WarehouseGame = () => {
  const [gameState, setGameState] = useState('intro');
  const [time, setTime] = useState(60);
  const [money, setMoney] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [forkliftPos, setForkliftPos] = useState({ x: 1, y: 4 });
  const [cargo, setCargo] = useState([]);
  const [moves, setMoves] = useState(20);
  const actionCooldownRef = useRef(false);
  const keysPressed = useRef(new Set());
  
  const [storage, setStorage] = useState({
    green: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, 
      { x: 1, y: 1 }, { x: 1, y: 2 }
    ],
    blue: [
      { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 1 }
    ],
    red: [
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
      { x: 3, y: 2 }
    ]
  });
  
  const [currentOrder, setCurrentOrder] = useState({
    items: ['green', 'green', 'red'],
    reward: 2100,
    timeLeft: 20
  });
  
  const [collected, setCollected] = useState([]);
  const [lastOrderColors, setLastOrderColors] = useState([]);

  const restockWarehouse = useCallback(() => {
    setStorage(prevStorage => {
      const newStorage = {};
      
      const freePositions = {
        green: [
          { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 },
          { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }
        ],
        blue: [
          { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 },
          { x: 3, y: 1 }, { x: 3, y: 2 }
        ],
        red: [
          { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 },
          { x: 3, y: 3 }, { x: 3, y: 4 }
        ]
      };
      
      Object.keys(prevStorage).forEach(color => {
        const items = prevStorage[color] || [];
        const available = items.filter(item => 
          !collected.includes(`${color}-${item.x}-${item.y}`)
        ).length;
        
        newStorage[color] = [...items];
        
        if (available < 3) {
          const occupied = items.map(i => `${i.x}-${i.y}`);
          const free = freePositions[color].filter(
            pos => !occupied.includes(`${pos.x}-${pos.y}`)
          );
          
          const toAdd = Math.min(3, free.length);
          for (let i = 0; i < toAdd; i++) {
            if (free[i]) {
              newStorage[color].push(free[i]);
            }
          }
        }
      });
      
      return newStorage;
    });
  }, [collected]);

  const generateOrder = useCallback(() => {
    const availableByColor = {
      green: 0,
      blue: 0,
      red: 0
    };
    
    Object.entries(storage).forEach(([color, items]) => {
      items.forEach(item => {
        if (!collected.includes(`${color}-${item.x}-${item.y}`)) {
          availableByColor[color]++;
        }
      });
    });
    
    const availableColors = Object.entries(availableByColor)
      .filter(([_, count]) => count >= 2)
      .map(([color]) => color);
    
    if (availableColors.length === 0) {
      return {
        items: ['green', 'green'],
        reward: 1800,
        timeLeft: 20
      };
    }
    
    const orderSize = Math.floor(Math.random() * 4) + 2;
    const items = [];
    
    for (let i = 0; i < orderSize; i++) {
      const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
      items.push(randomColor);
    }
    
    return {
      items,
      reward: 1500 + items.length * 300,
      timeLeft: 20
    };
  }, [storage, collected]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      setTime(prev => {
        if (prev <= 1) {
          setGameState('finished');
          return 0;
        }
        return prev - 1;
      });
      
      setCurrentOrder(prev => ({
        ...prev,
        timeLeft: Math.max(0, prev.timeLeft - 1)
      }));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState]);

  const moveForkift = useCallback((dx, dy) => {
    if (gameState !== 'playing' || moves <= 0) return;
    
    setForkliftPos(prev => {
      const newX = Math.max(0, Math.min(4, prev.x + dx));
      const newY = Math.max(0, Math.min(4, prev.y + dy));
      
      if (newX !== prev.x || newY !== prev.y) {
        setMoves(m => m - 1);
        return { x: newX, y: newY };
      }
      return prev;
    });
  }, [gameState, moves]);

  const handleAction = useCallback(() => {
    if (gameState !== 'playing') return;
    if (actionCooldownRef.current) return;
    
    let itemTaken = false;
    
    Object.entries(storage).forEach(([color, items]) => {
      if (itemTaken) return;
      
      items.forEach(item => {
        if (itemTaken) return;
        
        const itemKey = `${color}-${item.x}-${item.y}`;
        
        if (item.x === forkliftPos.x && 
            item.y === forkliftPos.y && 
            !collected.includes(itemKey) &&
            cargo.length < 5) {
          
          setCargo(prev => [...prev, color]);
          setCollected(prev => [...prev, itemKey]);
          itemTaken = true;
          
          actionCooldownRef.current = true;
          setTimeout(() => {
            actionCooldownRef.current = false;
          }, 300);
        }
      });
    });
  }, [gameState, forkliftPos, storage, collected, cargo]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      
      if (keysPressed.current.has(e.key)) return;
      
      keysPressed.current.add(e.key);
      
      switch(e.key) {
        case 'ArrowUp': 
          moveForkift(0, -1); 
          break;
        case 'ArrowDown': 
          moveForkift(0, 1); 
          break;
        case 'ArrowLeft': 
          moveForkift(-1, 0); 
          break;
        case 'ArrowRight': 
          moveForkift(1, 0); 
          break;
        case ' ': 
          handleAction();
          break;
        default:
          break;
      }
    };
    
    const handleKeyUp = (e) => {
      keysPressed.current.delete(e.key);
    };
    
    // Очистка при потере фокуса (когда переключаешься на другую вкладку)
    const handleBlur = () => {
      keysPressed.current.clear();
    };
    
    // Очистка при изменении видимости страницы
    const handleVisibilityChange = () => {
      if (document.hidden) {
        keysPressed.current.clear();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      keysPressed.current.clear();
    };
  }, [gameState, moveForkift, handleAction]);

  const handleCellClick = useCallback((x, y) => {
    if (gameState !== 'playing') return;
    
    if (x === forkliftPos.x && y === forkliftPos.y) {
      handleAction();
    }
  }, [gameState, forkliftPos, handleAction]);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchMove = (e) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
    
    if (Math.abs(distanceX) < minSwipeDistance && Math.abs(distanceY) < minSwipeDistance) {
      return;
    }
    
    if (isHorizontalSwipe) {
      moveForkift(distanceX > 0 ? -1 : 1, 0);
    } else {
      moveForkift(0, distanceY > 0 ? -1 : 1);
    }
  };

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    if (forkliftPos.x === 4 && forkliftPos.y === 0 && cargo.length > 0) {
      const timeout = setTimeout(() => {
        setCargo([]);
        setCollected([]);
      }, 200);
      return () => clearTimeout(timeout);
    }
    
    if (forkliftPos.y === 0 && forkliftPos.x < 4 && cargo.length > 0) {
      const orderSequence = currentOrder.items;
      const cargoSequence = cargo;
      
      const isCorrectSequence = orderSequence.length === cargoSequence.length &&
                                orderSequence.every((item, index) => item === cargoSequence[index]);
      
      if (isCorrectSequence) {
        const timeout = setTimeout(() => {
          setMoney(m => m + currentOrder.reward);
          setCompletedOrders(c => c + 1);
          
          const timeBonus = currentOrder.items.length === 2 ? 20 :
                           currentOrder.items.length === 3 ? 25 :
                           currentOrder.items.length === 4 ? 30 : 35;
          setTime(t => t + timeBonus);
          
          setLastOrderColors(currentOrder.items);
          setCargo([]);
          setCollected([]);
          
          restockWarehouse();
          setCurrentOrder(generateOrder());
          setMoves(m => m + 10);
        }, 300);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setCargo([]);
          setCollected([]);
        }, 500);
        return () => clearTimeout(timeout);
      }
    }
  }, [forkliftPos, cargo, gameState, currentOrder, generateOrder, restockWarehouse]);

  const startGame = useCallback(() => {
    setGameState('playing');
    setTime(60);
    setMoney(0);
    setCompletedOrders(0);
    setForkliftPos({ x: 1, y: 4 });
    setCargo([]);
    setCollected([]);
    setMoves(20);
    setLastOrderColors([]);
    actionCooldownRef.current = false;
    keysPressed.current.clear();
    
    setStorage({
      green: [
        { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, 
        { x: 1, y: 1 }, { x: 1, y: 2 }
      ],
      blue: [
        { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 1 }
      ],
      red: [
        { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
        { x: 3, y: 2 }
      ]
    });
    
    setCurrentOrder({
      items: ['green', 'green', 'red'],
      reward: 2100,
      timeLeft: 20
    });
  }, []);

  const renderCell = useCallback((x, y) => {
    const isForkift = forkliftPos.x === x && forkliftPos.y === y;
    const isExit = y === 0 && x < 4;
    const isResetZone = y === 0 && x === 4;
    
    let item = null;
    let itemColor = '';
    
    Object.entries(storage).forEach(([color, items]) => {
      items.forEach(storageItem => {
        if (storageItem.x === x && storageItem.y === y && !collected.includes(`${color}-${x}-${y}`)) {
          item = color;
          itemColor = color === 'green' ? 'bg-green-500' : 
                      color === 'blue' ? 'bg-blue-500' : 'bg-red-500';
        }
      });
    });
    
    return (
      <div 
        key={`${x}-${y}`}
        onClick={() => handleCellClick(x, y)}
        className={`w-14 h-14 sm:w-16 sm:h-16 border-2 flex items-center justify-center relative cursor-pointer ${
          isExit ? 'bg-yellow-200 border-yellow-500' : 
          isResetZone ? 'bg-red-100 border-red-400' :
          'bg-gray-100 border-gray-300'
        } ${isForkift && item ? 'ring-4 ring-blue-400' : ''}`}
      >
        {isExit && <span className="text-[10px] sm:text-xs font-bold pointer-events-none">ВЫХОД</span>}
        {isResetZone && (
          <div className="flex flex-col items-center pointer-events-none">
            <RotateCw className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            <span className="text-[8px] sm:text-[10px] font-bold text-red-600">СБРОС</span>
          </div>
        )}
        {item && <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded ${itemColor} animate-pulse pointer-events-none`}></div>}
        {isForkift && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Truck className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-600" />
            {cargo.length > 0 && (
              <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-orange-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold">
                {cargo.length}
              </div>
            )}
          </div>
        )}
        {isForkift && item && (
          <div className="absolute bottom-0 left-0 right-0 bg-blue-500 text-white text-[8px] sm:text-[10px] font-bold py-0.5 text-center pointer-events-none">
            ТАП - ВЗЯТЬ
          </div>
        )}
      </div>
    );
  }, [forkliftPos, storage, collected, cargo, handleCellClick]);

  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md text-center">
          <Truck className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
          <h1 className="text-3xl font-bold mb-4">🚜 ПОСЛЕДНЯЯ МИЛЯ</h1>
          <p className="text-gray-600 mb-6">
            Ты — оператор склада.<br/>
            У тебя <b>60 секунд</b> и <b>20 ходов</b>.<br/>
            Выполни максимум заказов!
          </p>
          <div className="bg-gray-100 p-4 rounded-lg mb-6 text-left">
            <p className="text-sm mb-2"><b>Управление:</b></p>
            <p className="text-sm">📱 <b>Мобильное:</b> Свайп для движения, ТАП по клетке погрузчика для взятия груза</p>
            <p className="text-sm">🎮 <b>ПК:</b> Стрелки + Пробел</p>
            <p className="text-sm mb-2">📦 Собери товары → вези на ВЫХОД</p>
            <p className="text-xs text-red-600 font-bold">⚠️ ВАЖНО: Собирай в ТОЧНОЙ последовательности как на карточке!</p>
          </div>
          <button 
            onClick={startGame}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg text-xl transition-colors"
          >
            СТАРТ! 🔥
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md text-center">
          <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-3xl font-bold mb-4">СМЕНА ОКОНЧЕНА!</h2>
          
          <div className="space-y-3 mb-6">
            <div className="bg-green-100 p-3 rounded">
              <span className="text-2xl font-bold text-green-700">{completedOrders}</span>
              <span className="text-gray-600 ml-2">заказов выполнено</span>
            </div>
            <div className="bg-blue-100 p-3 rounded">
              <span className="text-2xl font-bold text-blue-700">{money} U</span>
              <span className="text-gray-600 ml-2">заработано</span>
            </div>
            <div className="bg-purple-100 p-3 rounded">
              <span className="font-bold">Ранг:</span> {
                completedOrders >= 3 ? '🏆 МАСТЕР' : 
                completedOrders >= 2 ? '⭐ ОПЕРАТОР' : 
                '📦 СТАЖЁР'
              }
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-lg mb-4">
            <p className="text-sm mb-2">В настольной версии:</p>
            <p className="text-xs">✅ Играй вчетвером<br/>
            ✅ Стройте стратегии<br/>
            ✅ 8 уникальных героев<br/>
            ✅ Без ограничения времени!</p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={startGame}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCw className="w-5 h-5" />
              ЕЩЁ РАЗ
            </button>
            <button 
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              🛒 КУПИТЬ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto mb-4">
        <div className="bg-gray-900 text-white rounded-lg p-4 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-400" />
            <span className={`text-xl sm:text-2xl font-bold ${time < 10 ? 'text-red-400 animate-pulse' : ''}`}>
              {time}s
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-lg sm:text-xl font-bold">{money} U</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            <span className="text-lg sm:text-xl font-bold">{completedOrders}</span>
          </div>

          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-yellow-400" />
            <span className={`text-lg sm:text-xl font-bold ${moves < 5 ? 'text-red-400' : ''}`}>
              {moves}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-bold mb-2 text-center">СКЛАД</h3>
            <div 
              className="grid grid-cols-5 gap-1 mb-4 touch-none select-none"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {[0,1,2,3,4].map(y => 
                [0,1,2,3,4].map(x => renderCell(x, y))
              )}
            </div>
            
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-lg mb-3 md:hidden">
              <p className="text-sm font-bold mb-2">📱 Управление:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/20 p-2 rounded">👆 <b>Свайп</b><br/>Движение машинки</div>
                <div className="bg-white/20 p-2 rounded">👇 <b>Тап по клетке</b><br/>Взять товар</div>
              </div>
              <div className="mt-2 bg-white/20 p-2 rounded text-xs">
                🔄 <b>Правый угол</b> — Сброс груза
              </div>
              <div className="mt-2 bg-red-500/80 p-2 rounded text-xs font-bold">
                ⚠️ Собирай в ТОЧНОЙ последовательности!
              </div>
            </div>
            
            <div className="bg-gray-100 p-3 rounded text-sm hidden md:block">
              <p><b>Управление:</b> Стрелки + Пробел</p>
              <p className="text-xs text-gray-600 mt-1">
                ✅ Собери → ВЫХОД → автоотгрузка
              </p>
              <p className="text-xs text-red-600 mt-1 font-bold">
                ⚠️ ВАЖНО: Собирай в ТОЧНОЙ последовательности слева направо!
              </p>
              <p className="text-xs text-gray-600 mt-1">
                🔄 Ошибся? СБРОС (правый угол)
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              📋 СРОЧНЫЙ ЗАКАЗ
              {currentOrder.timeLeft < 10 && <span className="text-red-500 animate-pulse">🔥</span>}
            </h3>
            
            <p className="text-xs text-red-600 font-bold mb-2">
              ⚠️ Собирай слева направо в точной последовательности!
            </p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {currentOrder.items.map((item, idx) => (
                <div 
                  key={idx}
                  className={`w-10 h-10 rounded relative ${
                    item === 'green' ? 'bg-green-500' :
                    item === 'blue' ? 'bg-blue-500' :
                    'bg-red-500'
                  }`}
                >
                  <div className="absolute -top-2 -right-2 bg-white text-gray-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border-2 border-gray-300">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-green-100 p-2 rounded mb-2">
              <span className="font-bold text-green-700">+{currentOrder.reward} U</span>
              <span className="text-green-600 text-xs ml-2">
                (+{currentOrder.items.length === 2 ? '20' : 
                   currentOrder.items.length === 3 ? '25' :
                   currentOrder.items.length === 4 ? '30' : '35'}s)
              </span>
            </div>
            
            <div className="bg-gray-100 p-2 rounded">
              <div className="flex justify-between text-xs mb-1">
                <span>Осталось:</span>
                <span className="font-bold">{currentOrder.timeLeft}s</span>
              </div>
              <div className="h-2 bg-gray-300 rounded overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    currentOrder.timeLeft > 10 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(currentOrder.timeLeft / 20) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {cargo.length > 0 && (
            <div className="bg-yellow-100 border-2 border-yellow-500 rounded-lg p-4">
              <h3 className="font-bold mb-2">🚜 НА ПОГРУЗЧИКЕ:</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {cargo.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`w-8 h-8 rounded relative ${
                      item === 'green' ? 'bg-green-500' :
                      item === 'blue' ? 'bg-blue-500' :
                      'bg-red-500'
                    }`}
                  >
                    <div className="absolute -top-1 -right-1 bg-white text-gray-800 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold border border-gray-300">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mb-1">
                ✅ Вези на ВЫХОД (слева вверху)
              </p>
              <p className="text-xs text-red-600 mb-1 font-bold">
                ⚠️ Проверь последовательность!
              </p>
              <p className="text-xs text-orange-600">
                🔄 Неправильно? Заедь в СБРОС (справа)
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 text-xs">
            <p className="font-bold mb-1">💡 Совет:</p>
            <p className="mb-1">📱 <b>Мобильные:</b> Тапайте прямо по клетке с погрузчиком!</p>
            <p>🎮 <b>ПК:</b> Используйте пробел для взятия груза</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseGame;
