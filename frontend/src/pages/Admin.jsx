import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [passwords, setPasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    const loadUsers = async () => {
      try {
        const data = await api.getUsers();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isAdmin, navigate]);

  const handleFieldChange = (id, field, value) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, [field]: value } : user)));
  };

  const handlePasswordChange = (id, value) => {
    setPasswords((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async (user) => {
    setError('');
    setSuccess('');
    const payload = { email: user.email };
    if (user.name) payload.name = user.name;
    if (passwords[user.id]) payload.password = passwords[user.id];

    if (!payload.email) {
      setError('Email is required to update a user.');
      return;
    }

    try {
      setSavingId(user.id);
      await api.updateUser(user.id, payload);
      setSuccess('User updated successfully.');
      setPasswords((prev) => ({ ...prev, [user.id]: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Admin User Management</h1>
            <p className="text-sm text-gray-500">Change email and password for admin and cashier accounts here.</p>
          </div>
        </div>

        {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700">{success}</div>}

        {loading ? (
          <div className="mt-8 text-gray-500">Loading users...</div>
        ) : (
          <div className="mt-8 grid gap-4">
            {users.map((user) => (
              <div key={user.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Input
                      label="Name"
                      value={user.name}
                      onChange={(e) => handleFieldChange(user.id, 'name', e.target.value)}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={user.email}
                      onChange={(e) => handleFieldChange(user.id, 'email', e.target.value)}
                    />
                    <Input
                      label="New Password"
                      type="password"
                      value={passwords[user.id] || ''}
                      onChange={(e) => handlePasswordChange(user.id, e.target.value)}
                      placeholder="Leave blank to keep current password"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      onClick={() => handleSave(user)}
                      loading={savingId === user.id}
                      disabled={savingId === user.id}
                    >
                      Save changes
                    </Button>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  Role: <span className="font-medium text-gray-700">{user.role}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
