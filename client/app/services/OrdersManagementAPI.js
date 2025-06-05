class OrdersManagementAPI {
  constructor() {
    this.baseURL = '/api/orders-management';
    this.cache = new Map();
    this.tailorsCache = null;
    this.tailorsCacheExpiry = null;
  }

  /**
   * Get authentication headers
   */
  getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Generic API call handler with error handling
   */
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  /**
   * Get optimized orders list with server-side filtering and pagination
   * @param {Object} params - { page, limit, status, priority, search, startDate, endDate, sortBy, sortOrder }
   * @returns {Promise<Object>} - { orders, pagination, filters }
   */
  async getOrdersList(params = {}) {
    const queryParams = new URLSearchParams();
    
    // Add all parameters to query string
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    const cacheKey = `orders-list-${queryParams.toString()}`;
    
    // Check cache (valid for 30 seconds for frequently changing data)
    if (this.cache.has(cacheKey)) {
      const { data, timestamp } = this.cache.get(cacheKey);
      if (Date.now() - timestamp < 30000) { // 30 seconds cache
        return data;
      }
    }

    const url = `${this.baseURL}/list?${queryParams}`;
    const data = await this.makeRequest(url);

    // Cache the result
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Get cached tailors list
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise<Array>} - Array of tailor objects
   */
  async getTailors(forceRefresh = false) {
    const now = Date.now();
    
    // Check local cache first (1 hour cache)
    if (!forceRefresh && this.tailorsCache && this.tailorsCacheExpiry && now < this.tailorsCacheExpiry) {
      return this.tailorsCache;
    }

    const data = await this.makeRequest(`${this.baseURL}/tailors`);

    // Update local cache
    this.tailorsCache = data;
    this.tailorsCacheExpiry = now + (60 * 60 * 1000); // 1 hour

    return data;
  }

  /**
   * Get complete order details for modals
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} - Complete order object
   */
  async getOrderDetails(orderId) {
    const cacheKey = `order-details-${orderId}`;
    
    // Check cache (valid for 2 minutes)
    if (this.cache.has(cacheKey)) {
      const { data, timestamp } = this.cache.get(cacheKey);
      if (Date.now() - timestamp < 120000) { // 2 minutes cache
        return data;
      }
    }

    const data = await this.makeRequest(`${this.baseURL}/${orderId}/details`);

    // Cache the result
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Update order status with optimistic updates
   * @param {number} orderId - Order ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated order data
   */
  async updateOrderStatus(orderId, status) {
    const data = await this.makeRequest(`${this.baseURL}/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    // Invalidate related caches
    this.invalidateOrdersCaches();
    this.cache.delete(`order-details-${orderId}`);

    return data;
  }

  /**
   * Update order tailor assignment with optimistic updates
   * @param {number} orderId - Order ID
   * @param {number|null} tailorContactId - Tailor Contact ID or null to unassign
   * @returns {Promise<Object>} - Updated order data
   */
  async updateOrderTailor(orderId, tailorContactId) {
    const data = await this.makeRequest(`${this.baseURL}/${orderId}/tailor`, {
      method: 'PUT',
      body: JSON.stringify({ tailorContactId })
    });

    // Invalidate related caches
    this.invalidateOrdersCaches();
    this.cache.delete(`order-details-${orderId}`);

    return data;
  }

  /**
   * Clear tailors cache on server and client
   * @returns {Promise<Object>} - Success response
   */
  async clearTailorsCache() {
    const data = await this.makeRequest(`${this.baseURL}/cache/clear-tailors`, {
      method: 'POST'
    });

    // Clear local cache too
    this.tailorsCache = null;
    this.tailorsCacheExpiry = null;

    return data;
  }

  /**
   * Create new order with optimized processing
   * @param {Object} orderData - Order data with products array
   * @returns {Promise<Object>} - Created order data with stock results
   */
  async createOrder(orderData) {
    const data = await this.makeRequest(`${this.baseURL}`, {
      method: 'POST',
      body: JSON.stringify(orderData)
    });

    // Invalidate orders list caches after creation
    this.invalidateOrdersCaches();

    return data;
  }

  /**
   * Update existing order with enhanced validation
   * @param {number} orderId - Order ID
   * @param {Object} orderData - Updated order data
   * @returns {Promise<Object>} - Updated order data with stock results
   */
  async updateOrder(orderId, orderData) {
    const data = await this.makeRequest(`${this.baseURL}/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(orderData)
    });

    // Invalidate related caches
    this.invalidateOrdersCaches();
    this.cache.delete(`order-details-${orderId}`);

    return data;
  }

  /**
   * Delete order with safety checks
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} - Deletion confirmation
   */
  async deleteOrder(orderId) {
    const data = await this.makeRequest(`${this.baseURL}/${orderId}`, {
      method: 'DELETE'
    });

    // Invalidate related caches
    this.invalidateOrdersCaches();
    this.cache.delete(`order-details-${orderId}`);

    return data;
  }

  /**
   * Invalidate all orders list caches
   * Called after updates that affect orders list
   */
  invalidateOrdersCaches() {
    for (const [key] of this.cache) {
      if (key.startsWith('orders-list-')) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all caches
   * Useful for logout or major data changes
   */
  clearAllCaches() {
    this.cache.clear();
    this.tailorsCache = null;
    this.tailorsCacheExpiry = null;
  }

  /**
   * Preload next page for pagination
   * @param {Object} currentParams - Current filter/pagination parameters
   */
  async preloadNextPage(currentParams) {
    if (!currentParams.page) return;
    
    const nextPageParams = {
      ...currentParams,
      page: parseInt(currentParams.page) + 1
    };

    // Preload in background without blocking
    setTimeout(() => {
      this.getOrdersList(nextPageParams).catch(() => {
        // Ignore errors for preloading
      });
    }, 100);
  }

  /**
   * Get cache statistics for debugging
   * @returns {Object} - Cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      tailorsCached: !!this.tailorsCache,
      tailorsCacheExpiry: this.tailorsCacheExpiry ? new Date(this.tailorsCacheExpiry) : null,
      cacheKeys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
const ordersManagementAPI = new OrdersManagementAPI();
export default ordersManagementAPI; 