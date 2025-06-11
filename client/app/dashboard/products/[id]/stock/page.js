'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthWrapper from '../../../../components/AuthWrapper';
import DashboardLayout from '../../../../components/DashboardLayout';
import Link from 'next/link';

export default function ProductStockPage() {
    const [product, setProduct] = useState(null);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [adjustmentForm, setAdjustmentForm] = useState({
        type: 'IN',
        quantity: '',
        reason: ''
    });
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [adjustmentLoading, setAdjustmentLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const router = useRouter();
    const params = useParams();
    const productId = params.id;

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (!token || !storedUser) {
            router.push('/login');
            return;
        }

        try {
            const userData = JSON.parse(storedUser);
            setUser(userData);

            // Check if user is admin
            if (userData.role !== 'admin') {
                router.push('/dashboard');
                return;
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            router.push('/login');
            return;
        }
    }, [router]);

    // Fetch product details and stock movements
    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            // Fetch product details
            const productResponse = await fetch(`http://localhost:8080/api/products/${productId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!productResponse.ok) {
                throw new Error('Failed to fetch product details');
            }

            const productData = await productResponse.json();
            setProduct(productData.product || productData);

            // Fetch stock movements
            const movementsResponse = await fetch(`http://localhost:8080/api/products/${productId}/stock/movements?page=${currentPage}&limit=20`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (movementsResponse.ok) {
                const movementsData = await movementsResponse.json();
                setMovements(movementsData.movements || []);
                setTotalPages(movementsData.pagination?.pages || 1);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load product data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && productId) {
            fetchData();
        }
    }, [user, productId, currentPage]);

    // Handle stock adjustment
    const handleStockAdjustment = async (e) => {
        e.preventDefault();

        if (!adjustmentForm.quantity || !adjustmentForm.reason) {
            setError('Quantity and reason are required');
            return;
        }

        try {
            setAdjustmentLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`http://localhost:8080/api/products/${productId}/stock/adjust`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: adjustmentForm.type,
                    quantity: parseInt(adjustmentForm.quantity),
                    reason: adjustmentForm.reason,
                    userId: user.id
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Reset form and close modal
                setAdjustmentForm({ type: 'IN', quantity: '', reason: '' });
                setShowAdjustmentModal(false);
                setError('');

                // Refresh data
                await fetchData();

                alert(`Stock adjusted successfully! New stock: ${data.product.newStock} ${product.unit}`);
            } else {
                throw new Error(data.message || 'Failed to adjust stock');
            }
        } catch (error) {
            console.error('Error adjusting stock:', error);
            setError(error.message || 'Failed to adjust stock');
        } finally {
            setAdjustmentLoading(false);
        }
    };

    // Handle set stock level
    const handleSetStockLevel = async () => {
        const newLevel = prompt(`Set stock level for ${product?.name}:`, product?.qtyOnHand?.toString() || '0');
        const reason = prompt('Reason for stock level change:');

        if (newLevel === null || reason === null || reason.trim() === '') {
            return;
        }

        const quantity = parseInt(newLevel);
        if (isNaN(quantity) || quantity < 0) {
            alert('Please enter a valid non-negative number');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`http://localhost:8080/api/products/${productId}/stock/set`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    quantity,
                    reason: reason.trim(),
                    userId: user.id
                }),
            });

            const data = await response.json();

            if (response.ok) {
                await fetchData();
                alert(`Stock level set successfully! New stock: ${data.product.newStock} ${product.unit}`);
            } else {
                throw new Error(data.message || 'Failed to set stock level');
            }
        } catch (error) {
            console.error('Error setting stock level:', error);
            setError(error.message || 'Failed to set stock level');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('id-ID');
    };

    const getMovementTypeColor = (type) => {
        switch (type) {
            case 'IN':
                return 'bg-green-100 text-green-800';
            case 'OUT':
                return 'bg-red-100 text-red-800';
            case 'ADJUST':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (!user) return null;

    return (
        <AuthWrapper>
            <DashboardLayout user={user}>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                                <Link href="/dashboard/products" className="hover:text-blue-600">Products</Link>
                                <span>›</span>
                                <Link href={`/dashboard/products/${productId}`} className="hover:text-blue-600">
                                    {product?.name || 'Product'}
                                </Link>
                                <span>›</span>
                                <span>Stock Management</span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
                            <p className="text-gray-600">Manage stock levels for {product?.name}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => fetchData()}
                                disabled={loading}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center space-x-2 disabled:opacity-50"
                            >
                                <span>🔄</span>
                                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {/* Product Stock Overview */}
                    {!loading && product && (
                        <>
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                                        <p className="text-sm text-gray-600">Code: {product.code}</p>
                                        <p className="text-sm text-gray-600">Category: {product.category || 'N/A'}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium text-gray-700">Current Stock</h4>
                                        <div className="flex items-center space-x-2">
                                            <span className={`text-2xl font-bold ${product.qtyOnHand === 0
                                                ? 'text-red-600'
                                                : product.qtyOnHand < 10
                                                    ? 'text-yellow-600'
                                                    : 'text-green-600'
                                                }`}>
                                                {product.qtyOnHand}
                                            </span>
                                            <span className="text-lg text-gray-600">{product.unit}</span>
                                        </div>
                                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${product.qtyOnHand === 0
                                            ? 'bg-red-100 text-red-800'
                                            : product.qtyOnHand < 10
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-green-100 text-green-800'
                                            }`}>
                                            {product.qtyOnHand === 0 ? 'Out of Stock' : product.qtyOnHand < 10 ? 'Low Stock' : 'In Stock'}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-gray-700">Stock Actions</h4>
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => setShowAdjustmentModal(true)}
                                                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                            >
                                                Adjust Stock
                                            </button>
                                            <button
                                                onClick={handleSetStockLevel}
                                                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                                            >
                                                Set Stock Level
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stock Movement History */}
                            <div className="bg-white rounded-lg shadow-sm border">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900">Stock Movement History</h3>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Type
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Quantity
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Stock After
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Notes
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    User
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {movements.length > 0 ? (
                                                movements.map((movement) => (
                                                    <tr key={movement.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {formatDate(movement.createdAt)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getMovementTypeColor(movement.movementType)}`}>
                                                                {movement.movementType}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {movement.movementType === 'OUT' ? '-' : '+'}
                                                            {movement.quantity} {movement.unit}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {movement.qtyAfter} {movement.unit}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                                            {movement.notes}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {movement.user?.name || 'System'}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                        No stock movements found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                                        <div className="text-sm text-gray-600">
                                            Page {currentPage} of {totalPages}
                                        </div>
                                        <div className="space-x-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage >= totalPages}
                                                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Stock Adjustment Modal */}
                    {showAdjustmentModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Adjust Stock</h3>

                                <form onSubmit={handleStockAdjustment} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Adjustment Type
                                        </label>
                                        <select
                                            value={adjustmentForm.type}
                                            onChange={(e) => setAdjustmentForm(prev => ({ ...prev, type: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="IN">Stock In (+)</option>
                                            <option value="OUT">Stock Out (-)</option>
                                            <option value="ADJUST">Direct Adjustment</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Quantity
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={adjustmentForm.quantity}
                                            onChange={(e) => setAdjustmentForm(prev => ({ ...prev, quantity: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter quantity"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Reason
                                        </label>
                                        <textarea
                                            value={adjustmentForm.reason}
                                            onChange={(e) => setAdjustmentForm(prev => ({ ...prev, reason: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Reason for adjustment"
                                            rows="3"
                                            required
                                        />
                                    </div>

                                    <div className="flex justify-end space-x-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowAdjustmentModal(false)}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                                            disabled={adjustmentLoading}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                            disabled={adjustmentLoading}
                                        >
                                            {adjustmentLoading ? 'Adjusting...' : 'Adjust Stock'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </AuthWrapper>
    );
} 