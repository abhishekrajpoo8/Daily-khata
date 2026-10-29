import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { 
  Home, CalendarPlus, Package, FileText, Settings, Plus, Minus, 
  Edit, Trash2, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight,
  TrendingUp, CreditCard, Droplet, Milk, Newspaper, ShoppingBag, Info,
  Download, X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- Firebase Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'daily-khata-app';

// --- Context & State Management ---
const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);

  // Data States
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rateHistory, setRateHistory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [payments, setPayments] = useState([]);
  
  // Auth Setup
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        setError('Authentication failed. App will not save data.');
        setIsInitializing(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Fetching (Strict paths, no complex queries)
  useEffect(() => {
    if (!user) return;
    
    const userPath = `artifacts/${appId}/users/${user.uid}`;
    
    const unsubProducts = onSnapshot(collection(db, userPath, 'products'), 
      (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Error fetching products:", err)
    );

    const unsubTransactions = onSnapshot(collection(db, userPath, 'transactions'), 
      (snap) => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Error fetching transactions:", err)
    );

    const unsubRateHistory = onSnapshot(collection(db, userPath, 'rateHistory'), 
      (snap) => setRateHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Error fetching rate history:", err)
    );

    const unsubSuppliers = onSnapshot(collection(db, userPath, 'suppliers'), 
      (snap) => setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Error fetching suppliers:", err)
    );

    const unsubPayments = onSnapshot(collection(db, userPath, 'payments'), 
      (snap) => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Error fetching payments:", err)
    );

    return () => {
      unsubProducts();
      unsubTransactions();
      unsubRateHistory();
      unsubSuppliers();
      unsubPayments();
    };
  }, [user]);

  // Data Actions
  const addTransaction = async (txData) => {
    if (!user) return;
    await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/transactions`), {
      ...txData,
      createdAt: new Date().toISOString()
    });
  };

  const deleteTransaction = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, id));
  };

  const saveProduct = async (productData, isNewRate = false, oldRate = 0) => {
    if (!user) return;
    const prodRef = productData.id 
      ? doc(db, `artifacts/${appId}/users/${user.uid}/products`, productData.id)
      : doc(collection(db, `artifacts/${appId}/users/${user.uid}/products`));
    
    const id = productData.id || prodRef.id;
    const now = new Date().toISOString();

    await setDoc(prodRef, { ...productData, id, updatedAt: now });

    // Handle Rate History
    if (isNewRate || !productData.id) {
      await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/rateHistory`), {
        productId: id,
        oldRate: oldRate,
        newRate: productData.currentRate,
        effectiveDate: now,
    });
  }
};

const saveSupplier = async (supplierData) => {
  if (!user) return;
  const ref = supplierData.id
    ? doc(db, `artifacts/${appId}/users/${user.uid}/suppliers`, supplierData.id)
    : doc(collection(db, `artifacts/${appId}/users/${user.uid}/suppliers`));
  await setDoc(ref, { ...supplierData, id: supplierData.id || ref.id, updatedAt: new Date().toISOString() });
};

const addPayment = async (paymentData) => {
  if (!user) return;
  await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/payments`), {
    ...paymentData,
    createdAt: new Date().toISOString()
  });
};

const value = {
  user, isInitializing, error,
  products, transactions, rateHistory, suppliers, payments,
  addTransaction, deleteTransaction, saveProduct, saveSupplier, addPayment
};

return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// --- Reusable UI Components ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', size = 'md', className = "", ...props }) => {
  const base = "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2";
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm",
    secondary: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-500",
    outline: "border border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-emerald-500",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-500",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  };
  
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Views ---

// 1. Dashboard
const DashboardView = () => {
  const { transactions, products } = useContext(AppContext);
  
  // Calculations based on local memory filtering (Rule 2 compliant)
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM
  
  const todayTx = transactions.filter(t => t.date === todayStr);
  const monthTx = transactions.filter(t => t.date.startsWith(thisMonthStr));

  const todayTotal = todayTx.reduce((sum, t) => sum + (t.quantity * t.appliedRate), 0);
  const monthTotal = monthTx.reduce((sum, t) => sum + (t.quantity * t.appliedRate), 0);

  // Group by product for chart
  const prodExpenditure = monthTx.reduce((acc, t) => {
    acc[t.productId] = (acc[t.productId] || 0) + (t.quantity * t.appliedRate);
    return acc;
  }, {});

  const chartData = Object.keys(prodExpenditure).map(pId => ({
    name: products.find(p => p.id === pId)?.name || 'Unknown',
    amount: prodExpenditure[pId]
  }));

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your household expenses</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-emerald-600 text-white border-none relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <ShoppingBag size={80} />
          </div>
          <p className="text-emerald-100 text-sm font-medium">Today's Purchases</p>
          <p className="text-3xl font-bold mt-1">₹{todayTotal.toFixed(2)}</p>
          <p className="text-emerald-100 text-xs mt-2">{todayTx.length} items recorded today</p>
        </Card>
        
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">This Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{monthTotal.toFixed(2)}</p>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Expenditure by Product</h3>
          {chartData.length > 0 ? (
             <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                 <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                 <Bar dataKey="amount" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={50} />
               </BarChart>
             </ResponsiveContainer>
           </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No data for this month yet.
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Recent Entries</h3>
          <div className="space-y-3">
            {transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map(tx => {
              const prod = products.find(p => p.id === tx.productId);
              return (
                <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                      <ShoppingBag size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{prod?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{tx.date} • {tx.quantity} {prod?.unit}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">₹{(tx.quantity * tx.appliedRate).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">@ ₹{tx.appliedRate}/{prod?.unit}</p>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">No recent transactions.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

// 2. Daily Entry
const DailyEntryView = () => {
  const { products, transactions, addTransaction, deleteTransaction } = useContext(AppContext);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // State for quick entry
  const [activeProduct, setActiveProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const selectedDateTx = transactions.filter(t => t.date === selectedDate);

  const handleQuickAdd = async (product) => {
    await addTransaction({
      date: selectedDate,
      productId: product.id,
      quantity: product.defaultQuantity || 1,
      appliedRate: product.currentRate, // Historical preservation
      isPaid: false,
      notes: ""
    });
  };

  const handleCustomAdd = async () => {
    if (!activeProduct || quantity <= 0) return;
    await addTransaction({
      date: selectedDate,
      productId: activeProduct.id,
      quantity: parseFloat(quantity),
      appliedRate: activeProduct.currentRate,
      isPaid: false,
      notes: notes
    });
    setActiveProduct(null);
    setQuantity(1);
    setNotes("");
  };

  const handleRepeatYesterday = async () => {
    const yesterday = new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 1)).toISOString().split('T')[0];
    const yesterdayTx = transactions.filter(t => t.date === yesterday);
    
    for (const tx of yesterdayTx) {
      // Find current product to apply the *current* rate, not yesterday's rate (unless instructed otherwise, but current rate is safer for a new entry)
      const prod = products.find(p => p.id === tx.productId);
      if (prod) {
        await addTransaction({
          date: selectedDate,
          productId: tx.productId,
          quantity: tx.quantity,
          appliedRate: prod.currentRate, // Apply today's saved rate
          isPaid: false,
          notes: tx.notes || ""
        });
      }
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 pb-20 md:pb-0">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Entry</h1>
          <p className="text-gray-500 text-sm mt-1">Record today's purchases quickly</p>
        </div>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 shadow-sm"
        />
      </header>

      {/* Quick Add Section */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">Quick Add (One Tap)</h3>
          <Button variant="secondary" size="sm" onClick={handleRepeatYesterday}>
            Repeat Yesterday
          </Button>
        </div>
        
        {products.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500 text-sm">
            Please add products in the 'Products' tab first.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {products.map(prod => {
              const iconMap = { 'litre': Milk, 'bottle': Droplet, 'piece': Newspaper };
              const Icon = iconMap[prod.unit] || ShoppingBag;
              
              return (
                <button
                  key={prod.id}
                  onClick={() => handleQuickAdd(prod)}
                  className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 shadow-sm rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-2 group-hover:bg-emerald-100 transition-colors">
                    <Icon size={24} />
                  </div>
                  <span className="font-medium text-gray-900 text-sm text-center line-clamp-1">{prod.name}</span>
                  <span className="text-xs text-gray-500 mt-1">₹{prod.currentRate}/{prod.unit}</span>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      {/* Custom Add Modal/Section */}
      <Card>
         <h3 className="font-semibold text-gray-900 mb-4">Custom Entry</h3>
         <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select 
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
                value={activeProduct?.id || ""}
                onChange={(e) => setActiveProduct(products.find(p => p.id === e.target.value))}
              >
                <option value="">Select a product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            
            <div className="w-full md:w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <div className="flex items-center">
                <button type="button" onClick={() => setQuantity(q => Math.max(0.1, q - 0.5))} className="bg-gray-100 p-2.5 rounded-l-xl border-y border-l border-gray-200 hover:bg-gray-200"><Minus size={16}/></button>
                <input 
                  type="number" step="0.01" min="0.01"
                  value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  className="bg-gray-50 border-y border-gray-200 text-gray-900 text-sm text-center block w-full p-2.5 focus:ring-0"
                />
                <button type="button" onClick={() => setQuantity(q => Number(q) + 0.5)} className="bg-gray-100 p-2.5 rounded-r-xl border-y border-r border-gray-200 hover:bg-gray-200"><Plus size={16}/></button>
              </div>
            </div>

            <div className="w-full md:w-auto">
              <Button onClick={handleCustomAdd} disabled={!activeProduct} className="w-full">
                Add Entry
              </Button>
            </div>
         </div>
      </Card>

      {/* Today's Log */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Recorded on {new Date(selectedDate).toLocaleDateString()}</h3>
        <div className="space-y-3">
          {selectedDateTx.length === 0 ? (
             <p className="text-center text-gray-400 py-6 text-sm">No items recorded for this date.</p>
          ) : (
            selectedDateTx.map(tx => {
              const prod = products.find(p => p.id === tx.productId);
              return (
                <div key={tx.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl bg-white shadow-sm">
                  <div>
                    <p className="font-medium text-gray-900">{prod?.name || 'Deleted Product'}</p>
                    <p className="text-xs text-gray-500">
                      {tx.quantity} {prod?.unit || 'units'} @ ₹{tx.appliedRate}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-gray-900">₹{(tx.quantity * tx.appliedRate).toFixed(2)}</span>
                    <button 
                      onClick={() => { if(window.confirm('Delete this entry?')) deleteTransaction(tx.id); }} // Simple confirm fallback, ideally custom modal but keeping it light
                      className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {selectedDateTx.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-lg font-bold text-gray-900">
            <span>Total:</span>
            <span>₹{selectedDateTx.reduce((sum, tx) => sum + (tx.quantity * tx.appliedRate), 0).toFixed(2)}</span>
          </div>
        )}
      </Card>
    </div>
  );
};

// 3. Products & Rates
const ProductsView = () => {
  const { products, saveProduct, rateHistory, suppliers } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingProd, setEditingProd] = useState(null);
  
  // Form State
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [unit, setUnit] = useState("piece");
  const [supplierId, setSupplierId] = useState("");
  
  const openAdd = () => {
    setEditingProd(null);
    setName(""); setRate(""); setUnit("piece"); setSupplierId("");
    setIsModalOpen(true);
  };

  const openEdit = (prod) => {
    setEditingProd(prod);
    setName(prod.name); setRate(prod.currentRate); setUnit(prod.unit); setSupplierId(prod.supplierId || "");
    setIsModalOpen(true);
  };

  const handlePreSave = (e) => {
    e.preventDefault();
    if (editingProd && Number(rate) !== Number(editingProd.currentRate)) {
      // Rate change detected! Require strict confirmation.
      setIsConfirmOpen(true);
    } else {
      handleFinalSave(false);
    }
  };

  const handleFinalSave = async (isRateChange = false) => {
    const data = {
      name,
      currentRate: Number(rate),
      unit,
      supplierId
    };
    if (editingProd?.id) {
      data.id = editingProd.id;
    }
    await saveProduct(data, isRateChange, editingProd?.currentRate || 0);
    setIsModalOpen(false);
    setIsConfirmOpen(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 pb-20 md:pb-0">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products & Rates</h1>
          <p className="text-gray-500 text-sm mt-1">Manage items and strict pricing</p>
        </div>
        <Button onClick={openAdd}><Plus size={18} className="mr-2"/> Add Product</Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map(prod => (
          <Card key={prod.id} className="flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{prod.name}</h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                  Per {prod.unit}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-emerald-600">₹{prod.currentRate}</span>
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
              <button className="text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1">
                <Info size={14}/> View Rate History
              </button>
              <Button variant="outline" size="sm" onClick={() => openEdit(prod)}>
                <Edit size={14} className="mr-2"/> Edit
              </Button>
            </div>
          </Card>
        ))}
        {products.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No products added yet.</p>
            <p className="text-sm mt-1">Add milk, newspaper, or water to get started.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProd ? "Edit Product" : "New Product"}>
        <form onSubmit={handlePreSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5" placeholder="e.g. Buffalo Milk" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Rate (₹)</label>
              <input required type="number" step="0.5" min="0" value={rate} onChange={e => setRate(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5">
                <option value="litre">Litre (L)</option>
                <option value="bottle">Bottle</option>
                <option value="piece">Piece / Day</option>
                <option value="kg">Kilogram (Kg)</option>
                <option value="packet">Packet</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier (Optional)</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5">
              <option value="">None / Self Managed</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Product</Button>
          </div>
        </form>
      </Modal>

      {/* Strict Rate Change Confirmation Modal */}
      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} title="Confirm Rate Change">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h4 className="text-lg font-bold text-gray-900 mb-2">Changing the rate of {name}</h4>
          <p className="text-gray-600 text-sm mb-4">
            You are changing the rate from <span className="font-bold line-through">₹{editingProd?.currentRate}</span> to <span className="font-bold text-emerald-600">₹{rate}</span>.
          </p>
          <div className="bg-blue-50 p-4 rounded-xl text-left border border-blue-100 mb-6">
            <p className="text-sm text-blue-800 font-medium">Important Rule:</p>
            <p className="text-xs text-blue-600 mt-1">
              This new rate will ONLY apply to purchases made from today onwards. All your previous entries and bills will keep the old rate of ₹{editingProd?.currentRate}.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => handleFinalSave(true)}>Yes, Update Rate</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// 4. Bills & Reports
const BillsView = () => {
  const { transactions, products, payments } = useContext(AppContext);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0,7));

  // Filter transactions for the selected month
  const monthTx = transactions.filter(t => t.date.startsWith(selectedMonth));
  const monthPayments = payments.filter(p => p.date.startsWith(selectedMonth));
  
  // Aggregate by product
  const billDetails = products.map(prod => {
    const prodTx = monthTx.filter(t => t.productId === prod.id);
    const totalQty = prodTx.reduce((sum, t) => sum + t.quantity, 0);
    const totalAmount = prodTx.reduce((sum, t) => sum + (t.quantity * t.appliedRate), 0);
    return { ...prod, totalQty, totalAmount, count: prodTx.length };
  }).filter(item => item.totalQty > 0);

  const grandTotal = billDetails.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalPaid = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = grandTotal - totalPaid;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 pb-20 md:pb-0">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Bills</h1>
          <p className="text-gray-500 text-sm mt-1">Review aggregated monthly expenditures</p>
        </div>
        <input 
          type="month" 
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 shadow-sm"
        />
      </header>

      <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-none">
        <p className="text-emerald-100 font-medium mb-1">Total Bill for {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
        <h2 className="text-4xl font-bold mb-4">₹{grandTotal.toFixed(2)}</h2>
        
        <div className="flex gap-8 border-t border-emerald-500/50 pt-4">
          <div>
            <p className="text-emerald-200 text-xs">Total Paid</p>
            <p className="font-semibold">₹{totalPaid.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-emerald-200 text-xs">Outstanding</p>
            <p className="font-semibold">₹{outstanding.toFixed(2)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-4">Itemized Breakdown</h3>
        {billDetails.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No purchases recorded in this month.</p>
        ) : (
          <div className="space-y-0">
            {billDetails.map((item, index) => (
              <div key={item.id} className={`flex justify-between items-center py-4 ${index !== billDetails.length -1 ? 'border-b border-gray-50' : ''}`}>
                <div>
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.totalQty} {item.unit} across {item.count} days
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₹{item.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Note about exact historical rates */}
      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm flex gap-3 items-start border border-blue-100">
        <Info size={20} className="shrink-0 text-blue-500 mt-0.5" />
        <p>
          <strong>Historical Accuracy Guaranteed:</strong> The amounts shown above are calculated using the exact rate that was saved on the specific date of purchase. Changing a product's price mid-month handles totals perfectly automatically.
        </p>
      </div>
    </div>
  );
};

// 5. Settings, Suppliers, and Payments
const SettingsView = () => {
  const { suppliers, payments, rateHistory, products, transactions, saveSupplier, addPayment } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('suppliers');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Supplier Form
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  
  // Payment Form
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentSupplier, setPaymentSupplier] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    await saveSupplier({ name: supplierName, phone: supplierPhone });
    setIsSupplierModalOpen(false);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    await addPayment({ date: paymentDate, amount: Number(paymentAmount), supplierId: paymentSupplier, method: paymentMethod });
    setIsPaymentModalOpen(false);
  };

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Product,Quantity,Rate,Total\n" 
      + transactions.map(t => {
          const p = products.find(p => p.id === t.productId);
          return `${t.date},${p?.name || 'Unknown'},${t.quantity},${t.appliedRate},${(t.quantity * t.appliedRate).toFixed(2)}`;
        }).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "daily_khata_export.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 pb-20 md:pb-0">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Settings & Management</h1>
        <p className="text-gray-500 text-sm mt-1">Suppliers, Payments, and App Data</p>
      </header>

      <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
        {['suppliers', 'payments', 'history', 'general'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'suppliers' && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Suppliers</h3>
            <Button size="sm" onClick={() => { setSupplierName(''); setSupplierPhone(''); setIsSupplierModalOpen(true); }}>
              <Plus size={16} className="mr-1"/> Add Supplier
            </Button>
          </div>
          <div className="space-y-3">
            {suppliers.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No suppliers added.</p>}
            {suppliers.map(s => (
              <div key={s.id} className="p-3 border border-gray-100 rounded-xl flex justify-between items-center bg-gray-50/50">
                <div>
                  <p className="font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.phone || 'No phone'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Payment Records</h3>
            <Button size="sm" onClick={() => { setPaymentAmount(''); setIsPaymentModalOpen(true); }}>
              <Plus size={16} className="mr-1"/> Record Payment
            </Button>
          </div>
          <div className="space-y-3">
            {payments.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No payments recorded.</p>}
            {payments.sort((a,b) => new Date(b.date) - new Date(a.date)).map(p => (
              <div key={p.id} className="p-3 border border-gray-100 rounded-xl flex justify-between items-center bg-white shadow-sm">
                <div>
                  <p className="font-medium text-gray-900">₹{p.amount} <span className="text-xs text-gray-500 font-normal">via {p.method}</span></p>
                  <p className="text-xs text-gray-500">{p.date} • {suppliers.find(s => s.id === p.supplierId)?.name || 'General'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Rate Change History</h3>
          <div className="space-y-3">
            {rateHistory.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No rate changes recorded.</p>}
            {rateHistory.sort((a,b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)).map(rh => (
              <div key={rh.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                <p className="font-medium text-gray-900">{products.find(p => p.id === rh.productId)?.name || 'Deleted Product'}</p>
                <p className="text-sm text-gray-600">Changed from <span className="line-through">₹{rh.oldRate}</span> to <span className="text-emerald-600 font-bold">₹{rh.newRate}</span></p>
                <p className="text-xs text-gray-400 mt-1">{new Date(rh.effectiveDate).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'general' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Export Data</h3>
                <p className="text-xs text-gray-500 mt-1">Download your transactions as a CSV file.</p>
              </div>
              <Button variant="outline" onClick={exportCSV}><Download size={16} className="mr-2"/> Export CSV</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Supplier Modal */}
      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="New Supplier">
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
            <input required type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl block w-full p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="tel" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl block w-full p-2.5" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsSupplierModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Supplier</Button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Record Payment">
        <form onSubmit={handleSavePayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input required type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl block w-full p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input required type="number" step="0.01" min="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl block w-full p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <select value={paymentSupplier} onChange={e => setPaymentSupplier(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl block w-full p-2.5">
              <option value="">General / None</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl block w-full p-2.5">
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// --- Main Layout ---
const AppLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isInitializing, error } = useContext(AppContext);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl max-w-md text-center border border-red-100">
          <AlertCircle size={48} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Setup Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'daily', label: 'Daily Entry', icon: CalendarPlus },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'bills', label: 'Bills', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 shadow-sm z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-emerald-600 text-white p-2 rounded-xl">
            <Book size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Daily Khata</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                activeTab === tab.id 
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <tab.icon size={20} className={activeTab === tab.id ? 'text-emerald-600' : 'text-gray-400'} />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 font-medium">Synced securely to cloud</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
           <div className="bg-emerald-600 text-white p-2 rounded-xl">
             <Book size={20} />
           </div>
           <h1 className="text-lg font-bold text-gray-900">Daily Khata</h1>
        </div>

        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'daily' && <DailyEntryView />}
        {activeTab === 'products' && <ProductsView />}
        {activeTab === 'bills' && <BillsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center p-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center p-2 min-w-[64px] rounded-xl transition-colors ${
                activeTab === tab.id ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <div className={`p-1 rounded-full ${activeTab === tab.id ? 'bg-emerald-50' : ''}`}>
                <tab.icon size={22} />
              </div>
              <span className="text-[10px] font-medium mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

// SVG Icon definition missing from lucide for the logo
const Book = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
);

export default function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}