'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import AuthWrapper from '../../components/AuthWrapper';

function ContactManagement() {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({
    SUPPLIER: { total: 0, active: 0 },
    WORKER: { total: 0, active: 0 },
    CUSTOMER: { total: 0, active: 0 },
    OTHER: { total: 0, active: 0 }
  });

  // Filter and pagination states
  const [filters, setFilters] = useState({
    contactType: 'all',
    search: '',
    isActive: 'true'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagination, setPagination] = useState({});

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    contactType: 'SUPPLIER',
    email: '',
    phone: '',
    whatsappPhone: '',
    address: '',
    company: '',
    notes: ''
  });

  // Contact notes states
  const [contactNotes, setContactNotes] = useState([]);
  const [noteFormData, setNoteFormData] = useState({
    noteType: 'general',
    title: '',
    note: '',
    priority: 'medium',
    isFollowUpRequired: false,
    followUpDate: ''
  });

  // Helper functions for auto-clearing messages
  const setSuccessWithTimeout = (message) => {
    setSuccess(message);
    setTimeout(() => {
      setSuccess('');
    }, 3000);
  };

  const setErrorWithTimeout = (message) => {
    setError(message);
    setTimeout(() => {
      setError('');
    }, 3000);
  };

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...filters
      });

      const response = await fetch(`http://localhost:8080/api/contacts?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      setContacts(data.contacts);
      setFilteredContacts(data.contacts);
      setPagination(data.pagination);
      setTotalPages(data.pagination.pages);

      if (data.filters?.typeStats) {
        setStats(data.filters.typeStats);
      }

      setError('');
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setErrorWithTimeout('Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [currentPage, filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // If changing contact type and it's not SUPPLIER, set company to "-"
    if (name === 'contactType' && value !== 'SUPPLIER') {
      setFormData(prev => ({ ...prev, [name]: value, company: '-' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle note form input changes
  const handleNoteInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNoteFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Create contact
  const handleCreateContact = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/contacts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create contact');
      }

      const data = await response.json();

      // Enhanced success message for workers (tailors)
      if (formData.contactType === 'WORKER') {
        setSuccessWithTimeout(`${data.message} - Worker will be available in Orders Management immediately.`);
      } else {
        setSuccessWithTimeout(data.message);
      }

      setShowCreateModal(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      console.error('Error creating contact:', error);
      setErrorWithTimeout(error.message);
    }
  };

  // Update contact
  const handleUpdateContact = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/contacts/${selectedContact.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update contact');
      }

      const data = await response.json();

      // Enhanced success message for workers (tailors)
      if (formData.contactType === 'WORKER' || selectedContact.contactType === 'WORKER') {
        setSuccessWithTimeout(`${data.message} - Changes will be reflected in Orders Management immediately.`);
      } else {
        setSuccessWithTimeout(data.message);
      }

      setShowEditModal(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      console.error('Error updating contact:', error);
      setErrorWithTimeout(error.message);
    }
  };

  // Delete contact
  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete contact');
      }

      const data = await response.json();
      setSuccessWithTimeout(data.message);
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      setErrorWithTimeout(error.message);
    }
  };

  // Fetch contact notes
  const fetchContactNotes = async (contactId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/contacts/${contactId}/notes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contact notes');
      }

      const data = await response.json();
      setContactNotes(data.notes);
    } catch (error) {
      console.error('Error fetching contact notes:', error);
      setErrorWithTimeout('Failed to load contact notes');
    }
  };

  // Create contact note
  const handleCreateNote = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/contacts/${selectedContact.id}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create note');
      }

      const data = await response.json();
      setSuccessWithTimeout('Note created successfully');
      resetNoteForm();
      fetchContactNotes(selectedContact.id);
    } catch (error) {
      console.error('Error creating note:', error);
      setErrorWithTimeout(error.message);
    }
  };

  // Reset forms
  const resetForm = () => {
    setFormData({
      name: '',
      contactType: 'SUPPLIER',
      email: '',
      phone: '',
      whatsappPhone: '',
      address: '',
      company: '',
      notes: ''
    });
  };

  const resetNoteForm = () => {
    setNoteFormData({
      noteType: 'general',
      title: '',
      note: '',
      priority: 'medium',
      isFollowUpRequired: false,
      followUpDate: ''
    });
  };

  // Modal handlers
  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (contact) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name || '',
      contactType: contact.contactType || 'SUPPLIER',
      email: contact.email || '',
      phone: contact.phone || '',
      whatsappPhone: contact.whatsappPhone || '',
      address: contact.address || '',
      company: contact.contactType === 'SUPPLIER' ? (contact.company || '') : '-',
      notes: contact.notes || ''
    });
    setShowEditModal(true);
  };

  const openViewModal = (contact) => {
    setSelectedContact(contact);
    setShowViewModal(true);
  };

  const openNotesModal = (contact) => {
    setSelectedContact(contact);
    fetchContactNotes(contact.id);
    resetNoteForm();
    setShowNotesModal(true);
  };

  // WhatsApp link generator
  const getWhatsAppUrl = (phone) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}`;
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Management</h1>
          <p className="text-gray-600">Manage suppliers, tailors, and internal contacts</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 bg-green-600 border border-green-700 text-white px-4 py-3 rounded">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-600 border border-red-700 text-white px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-600 rounded-lg">
                <span className="text-2xl text-white">🏭</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Suppliers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.SUPPLIER?.active || 0}
                  <span className="text-sm text-gray-500">/{stats.SUPPLIER?.total || 0}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-600 rounded-lg">
                <span className="text-2xl text-white">✂️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tailors</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.WORKER?.active || 0}
                  <span className="text-sm text-gray-500">/{stats.WORKER?.total || 0}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-600 rounded-lg">
                <span className="text-2xl text-white">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Customers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.CUSTOMER?.active || 0}
                  <span className="text-sm text-gray-500">/{stats.CUSTOMER?.total || 0}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Type Filter */}
              <select
                value={filters.contactType}
                onChange={(e) => handleFilterChange('contactType', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="SUPPLIER">Suppliers</option>
                <option value="WORKER">Tailors</option>
                <option value="CUSTOMER">Customers</option>
                <option value="OTHER">Others</option>
              </select>
            </div>

            {/* Create Button */}
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              + Create Contact
            </button>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      Loading contacts...
                    </td>
                  </tr>
                ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      No contacts found
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {contact.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${contact.contactType === 'SUPPLIER'
                          ? 'bg-blue-600 text-white'
                          : contact.contactType === 'WORKER'
                            ? 'bg-green-600 text-white'
                            : 'bg-purple-600 text-white'
                          }`}>
                          {contact.contactType === 'WORKER' ? 'TAILOR' : contact.contactType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {contact.email && (
                            <div>📧 {contact.email}</div>
                          )}
                          {contact.phone && (
                            <div>📞 {contact.phone}</div>
                          )}
                          {contact.whatsappPhone && (
                            <div>
                              <a
                                href={getWhatsAppUrl(contact.whatsappPhone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-800"
                              >
                                💬 {contact.whatsappPhone}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contact.company || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${contact.isActive
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                          }`}>
                          {contact.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openViewModal(contact)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => openEditModal(contact)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteContact(contact.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page {currentPage} of {totalPages} ({pagination.total} total contacts)
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {[...Array(totalPages)].map((_, index) => {
                      const page = index + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page
                            ? 'z-10 bg-blue-600 border-blue-700 text-white'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Contact Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Contact</h3>
              <form onSubmit={handleCreateContact} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      name="contactType"
                      value={formData.contactType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="SUPPLIER">Supplier</option>
                      <option value="WORKER">Tailor</option>
                      <option value="CUSTOMER">Internal</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp Phone
                    </label>
                    <input
                      type="text"
                      name="whatsappPhone"
                      value={formData.whatsappPhone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {formData.contactType === 'SUPPLIER' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Create Contact
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditModal && selectedContact && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Contact</h3>
              <form onSubmit={handleUpdateContact} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      name="contactType"
                      value={formData.contactType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="SUPPLIER">Supplier</option>
                      <option value="WORKER">Tailor</option>
                      <option value="CUSTOMER">Internal</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp Phone
                    </label>
                    <input
                      type="text"
                      name="whatsappPhone"
                      value={formData.whatsappPhone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {formData.contactType === 'SUPPLIER' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Update Contact
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Contact Modal */}
      {showViewModal && selectedContact && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedContact.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedContact.contactType === 'SUPPLIER'
                      ? 'bg-blue-600 text-white'
                      : selectedContact.contactType === 'WORKER'
                        ? 'bg-green-600 text-white'
                        : 'bg-purple-600 text-white'
                      }`}>
                      {selectedContact.contactType === 'WORKER' ? 'TAILOR' : selectedContact.contactType}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedContact.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedContact.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                    {selectedContact.whatsappPhone ? (
                      <a
                        href={getWhatsAppUrl(selectedContact.whatsappPhone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-sm text-green-600 hover:text-green-800"
                      >
                        {selectedContact.whatsappPhone}
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">N/A</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedContact.company || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedContact.address || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedContact.notes || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedContact.createdAt)}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedContact);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Edit Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Notes Modal */}
      {showNotesModal && selectedContact && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Contact Notes - {selectedContact.name}
              </h3>

              {/* Add Note Form */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">Add New Note</h4>
                <form onSubmit={handleCreateNote} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Note Type
                      </label>
                      <select
                        name="noteType"
                        value={noteFormData.noteType}
                        onChange={handleNoteInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="general">General</option>
                        <option value="order">Order</option>
                        <option value="purchase">Purchase</option>
                        <option value="performance">Performance</option>
                        <option value="communication">Communication</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        name="priority"
                        value={noteFormData.priority}
                        onChange={handleNoteInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={noteFormData.title}
                        onChange={handleNoteInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note *
                    </label>
                    <textarea
                      name="note"
                      value={noteFormData.note}
                      onChange={handleNoteInputChange}
                      required
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="isFollowUpRequired"
                        checked={noteFormData.isFollowUpRequired}
                        onChange={handleNoteInputChange}
                        className="mr-2"
                      />
                      Follow-up required
                    </label>

                    {noteFormData.isFollowUpRequired && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Follow-up Date
                        </label>
                        <input
                          type="date"
                          name="followUpDate"
                          value={noteFormData.followUpDate}
                          onChange={handleNoteInputChange}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Add Note
                    </button>
                  </div>
                </form>
              </div>

              {/* Notes List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {contactNotes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No notes found for this contact</p>
                ) : (
                  contactNotes.map((note) => (
                    <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${note.noteType === 'general' ? 'bg-gray-600 text-white' :
                            note.noteType === 'order' ? 'bg-blue-600 text-white' :
                              note.noteType === 'purchase' ? 'bg-green-600 text-white' :
                                note.noteType === 'performance' ? 'bg-yellow-600 text-white' :
                                  'bg-purple-600 text-white'
                            }`}>
                            {note.noteType}
                          </span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${note.priority === 'low' ? 'bg-gray-600 text-white' :
                            note.priority === 'medium' ? 'bg-blue-600 text-white' :
                              note.priority === 'high' ? 'bg-orange-600 text-white' :
                                'bg-red-600 text-white'
                            }`}>
                            {note.priority}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(note.createdAt)}
                        </span>
                      </div>

                      {note.title && (
                        <h5 className="font-medium text-gray-900 mb-2">{note.title}</h5>
                      )}

                      <p className="text-gray-700 mb-2">{note.note}</p>

                      {note.isFollowUpRequired && note.followUpDate && (
                        <div className="text-sm text-orange-600">
                          📅 Follow-up required by: {new Date(note.followUpDate).toLocaleDateString()}
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mt-2">
                        Created by: {note.CreatedByUser?.name || 'Unknown'}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContactManagementWrapper() {
  return (
    <AuthWrapper>
      <DashboardLayout>
        <ContactManagement />
      </DashboardLayout>
    </AuthWrapper>
  );
} 