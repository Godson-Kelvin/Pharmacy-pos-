import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  Package,
} from 'lucide-react';
import { api, formatCurrency, formatDate } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import { FadeIn } from '../components/Animated';

const emptyProduct = {
  name: '',
  sku: '',
  category: '',
  price: '',
  quantity: '',
  supplier: '',
  description: '',
  expiryDate: '',
};

export default function Inventory() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileRef = useRef();

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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyProduct);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      supplier: product.supplier || '',
      description: product.description || '',
      expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.updateProduct(editing.id, form);
      } else {
        await api.createProduct(form);
      }
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteProduct(id);
      setDeleteConfirm(null);
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await api.importProducts(file);
      setImportResult(result);
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const csv = 'name,sku,category,price,quantity,supplier,description,expiryDate\nParacetamol 500mg,MED-001,Pain Relief,5.00,200,PharmaGh Ltd,,2027-12-31';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <FadeIn>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 mt-1">Manage your pharmacy stock</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={downloadTemplate}>
              <Download size={16} /> Template
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Import CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button onClick={openCreate}>
              <Plus size={16} /> Add Product
            </Button>
          </div>
        )}
      </div>

      {importResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-xl text-sm"
        >
          <p className="font-medium text-primary-800">
            Import complete: {importResult.created} created, {importResult.updated} updated
          </p>
          {importResult.errors.length > 0 && (
            <p className="text-red-600 mt-1">{importResult.errors.length} errors</p>
          )}
          <button onClick={() => setImportResult(null)} className="text-primary-600 text-xs mt-2 underline">
            Dismiss
          </button>
        </motion.div>
      )}

      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-6 py-3 font-medium">SKU</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium text-right">Price</th>
                  <th className="px-6 py-3 font-medium text-right">Qty</th>
                  <th className="px-6 py-3 font-medium">Supplier</th>
                  {isAdmin && <th className="px-6 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((product, i) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      {product.expiryDate && (
                        <p className="text-xs text-gray-400">Exp: {formatDate(product.expiryDate)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{product.sku}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.quantity <= 5
                          ? 'bg-red-100 text-red-700'
                          : product.quantity <= 20
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{product.supplier || '—'}</td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(product)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(product)}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="SKU"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              required
            />
            <Input
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
            <Input
              label="Price (GHS)"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
            <Input
              label="Quantity"
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
            <Input
              label="Supplier"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            />
            <Input
              label="Expiry Date"
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Product"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)}>Delete</Button>
        </div>
      </Modal>
    </FadeIn>
  );
}
