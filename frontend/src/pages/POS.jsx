import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, Trash2, CreditCard, Smartphone, Banknote, CheckCircle } from 'lucide-react';
import { api, formatCurrency } from '../lib/api';
import Button from '../components/Button';
import { FadeIn } from '../components/Animated';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, [search]);

  const loadProducts = () => {
    setLoading(true);
    api.getProducts(search ? { search } : {})
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const addToCart = (product) => {
    setError('');
    const existing = cart.find((c) => c.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.quantity) {
        setError(`Only ${product.quantity} units available`);
        return;
      }
      setCart(cart.map((c) =>
        c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      if (product.quantity <= 0) {
        setError('Out of stock');
        return;
      }
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        maxQty: product.quantity,
      }]);
    }
  };

  const updateQty = (productId, delta) => {
    setCart(cart.map((c) => {
      if (c.productId !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > c.maxQty) return c;
      return { ...c, quantity: newQty };
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((c) => c.productId !== productId));
  };

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const handleCheckout = async () => {
    if (!cart.length) return;
    setProcessing(true);
    setError('');
    try {
      const sale = await api.createSale({
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        paymentMethod,
      });
      setReceipt(sale);
      setCart([]);
      loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const paymentIcons = {
    CASH: Banknote,
    MOBILE_MONEY: Smartphone,
    CARD: CreditCard,
  };

  return (
    <FadeIn>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
        <p className="text-gray-500 mt-1">Select products and process checkout</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product grid */}
        <div className="lg:col-span-2">
          <div className="relative mb-4">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <AnimatePresence>
                {products.filter((p) => p.quantity > 0).map((product, i) => (
                  <motion.button
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-xl p-4 border border-gray-100 text-left hover:border-primary-300 hover:shadow-md transition-all"
                  >
                    <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{product.sku}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary-600">{formatCurrency(product.price)}</span>
                      <span className="text-xs text-gray-400">{product.quantity} left</span>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-fit lg:sticky lg:top-24">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Current Sale</h2>
            <p className="text-xs text-gray-400 mt-0.5">{cart.length} item(s)</p>
          </div>

          <div className="flex-1 p-4 space-y-3 max-h-80 overflow-y-auto">
            <AnimatePresence>
              {cart.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Cart is empty</p>
              ) : (
                cart.map((item) => (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{formatCurrency(item.price)} each</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(item.productId, -1)}
                        className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.productId, 1)}
                        className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {error && (
            <div className="mx-4 mb-2 p-2 bg-red-50 text-red-600 text-xs rounded-lg">{error}</div>
          )}

          <div className="p-5 border-t border-gray-100 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {['CASH', 'MOBILE_MONEY', 'CARD'].map((method) => {
                  const Icon = paymentIcons[method];
                  return (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-medium transition-all ${
                        paymentMethod === method
                          ? 'bg-primary-50 text-primary-700 border-2 border-primary-500'
                          : 'bg-gray-50 text-gray-500 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={16} />
                      {method === 'MOBILE_MONEY' ? 'MoMo' : method.charAt(0) + method.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Total</span>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>

            <Button
              onClick={handleCheckout}
              loading={processing}
              disabled={!cart.length}
              className="w-full"
              size="lg"
            >
              Complete Sale
            </Button>
          </div>
        </div>
      </div>

      {/* Receipt modal */}
      <AnimatePresence>
        {receipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setReceipt(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <CheckCircle size={48} className="text-primary-600 mx-auto mb-4" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Sale Complete!</h3>
              <p className="text-gray-500 text-sm mb-4">Receipt: {receipt.receiptNo}</p>
              <p className="text-3xl font-bold text-primary-600 mb-6">{formatCurrency(receipt.total)}</p>
              <div className="text-left text-sm space-y-1 mb-6 bg-gray-50 rounded-xl p-4">
                {receipt.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-gray-600">{item.product.name} x{item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => setReceipt(null)} className="w-full">New Sale</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </FadeIn>
  );
}
