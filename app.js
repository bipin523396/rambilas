// Cinema Booking System - JavaScript Application

// Global variables
let selectedSeat = null;
let currentMovie = '';
let currentShowTime = '';
let currentBookingId = null;

// Form validation utilities
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const re = /^[0-9]{10,15}$/;
    return re.test(cleanPhone);
}

// Debounce function for search/filter functionality
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Local storage utilities (for offline functionality)
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.warn('Could not save to localStorage:', error);
    }
}

function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Could not read from localStorage:', error);
        return null;
    }
}

// Keyboard navigation support
document.addEventListener('keydown', function(e) {
    // Escape key closes modals
    if (e.key === 'Escape') {
        closeEditModal();
    }
    
    // Enter key on seats selects them
    if (e.key === 'Enter' && e.target.classList.contains('seat') && e.target.classList.contains('available')) {
        const seatNumber = e.target.dataset.seatNumber;
        const price = e.target.dataset.price;
        selectSeat(seatNumber, price);
    }
});

// Make seats focusable for accessibility
function makeSeatsFocusable() {
    const seats = document.querySelectorAll('.seat.available');
    seats.forEach(seat => {
        seat.setAttribute('tabindex', '0');
        seat.setAttribute('role', 'button');
        seat.setAttribute('aria-label', `Seat ${seat.dataset.seatNumber}, Price ₹${seat.dataset.price}`);
    });
}

// Update seat accessibility after loading
const originalDisplaySeats = displaySeats;
displaySeats = function(seats) {
    originalDisplaySeats(seats);
    makeSeatsFocusable();
};

// Error boundary for JavaScript errors
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    showAlert('An unexpected error occurred. Please refresh the page.', 'error');
});

// Performance monitoring
function logPerformance(action, startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`${action} took ${duration.toFixed(2)}ms`);
}

// Progressive Web App support (Service Worker registration)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Online/Offline status handling
window.addEventListener('online', function() {
    showAlert('Connection restored', 'success');
    // Sync any pending data when back online
    syncPendingData();
});

window.addEventListener('offline', function() {
    showAlert('You are now offline. Some features may not work.', 'error');
});

// Sync pending data when back online
function syncPendingData() {
    const pendingBookings = getFromLocalStorage('pendingBookings') || [];
    if (pendingBookings.length > 0) {
        // Process pending bookings
        pendingBookings.forEach(async (booking) => {
            try {
                await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(booking)
                });
            } catch (error) {
                console.error('Failed to sync booking:', error);
            }
        });
        
        // Clear pending bookings after sync
        localStorage.removeItem('pendingBookings');
        showAlert('Pending bookings synced successfully', 'success');
    }
}

// Analytics tracking (placeholder for Google Analytics or similar)
function trackEvent(action, category, label) {
    if (window.gtag) {
        gtag('event', action, {
            event_category: category,
            event_label: label
        });
    }
    console.log(`Analytics: ${category} - ${action} - ${label}`);
}

// Track user interactions
const originalSelectSeat = selectSeat;
selectSeat = function(seatNumber, price) {
    trackEvent('seat_selected', 'booking', seatNumber);
    originalSelectSeat(seatNumber, price);
};

const originalConfirmBooking = confirmBooking;
confirmBooking = async function() {
    trackEvent('booking_attempted', 'booking', currentMovie);
    await originalConfirmBooking();
};

// Toast notification system
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Remove after duration
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, duration);
}

// Initialize tooltips for better UX
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = e.target.dataset.tooltip;
    tooltip.style.cssText = `
        position: absolute;
        background: #333;
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10001;
        opacity: 0;
        transition: opacity 0.2s ease;
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
    
    setTimeout(() => tooltip.style.opacity = '1', 10);
    e.target._tooltip = tooltip;
}

function hideTooltip(e) {
    if (e.target._tooltip) {
        document.body.removeChild(e.target._tooltip);
        delete e.target._tooltip;
    }
}

// Print booking functionality
function printBooking(bookingId) {
    fetch(`/api/bookings/${bookingId}`)
        .then(response => response.json())
        .then(booking => {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Booking Confirmation</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .ticket { border: 2px solid #333; padding: 20px; margin: 20px 0; }
                        .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                        .details { margin: 20px 0; }
                        .details div { margin: 5px 0; }
                    </style>
                </head>
                <body>
                    <div class="ticket">
                        <div class="header">
                            <h1>🎬 Cinema Booking Confirmation</h1>
                            <h3>Booking ID: #${booking.id}</h3>
                        </div>
                        <div class="details">
                            <div><strong>Customer:</strong> ${booking.user_name}</div>
                            <div><strong>Email:</strong> ${booking.email}</div>
                            <div><strong>Phone:</strong> ${booking.phone}</div>
                            <div><strong>Movie:</strong> ${booking.movie_name}</div>
                            <div><strong>Show Time:</strong> ${booking.show_time}</div>
                            <div><strong>Seat:</strong> ${booking.seat_number} (${booking.seat_type})</div>
                            <div><strong>Price:</strong> ₹${booking.price}</div>
                            <div><strong>Status:</strong> ${booking.status}</div>
                            <div><strong>Booking Date:</strong> ${new Date(booking.booking_date).toLocaleString()}</div>
                        </div>
                        <div style="text-align: center; margin-top: 30px;">
                            <p>Please arrive 15 minutes before show time</p>
                            <p>Thank you for choosing our cinema!</p>
                        </div>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
            printWindow.close();
        })
        .catch(error => {
            console.error('Error fetching booking for print:', error);
            showAlert('Error loading booking details for print', 'error');
        });
}

// Initialize all features when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeTooltips();
    
    // Add print buttons to booking table (you can call this after loadBookings)
    const originalLoadBookings = loadBookings;
    loadBookings = async function() {
        await originalLoadBookings();
        addPrintButtons();
    };
});

function addPrintButtons() {
    const actionButtons = document.querySelectorAll('.action-buttons');
    actionButtons.forEach((buttonGroup, index) => {
        if (!buttonGroup.querySelector('.btn-print')) {
            const printBtn = document.createElement('button');
            printBtn.className = 'btn btn-info btn-print';
            printBtn.textContent = 'Print';
            printBtn.onclick = () => {
                const row = buttonGroup.closest('tr');
                const bookingId = row.querySelector('td').textContent.replace('#', '');
                printBooking(bookingId);
            };
            buttonGroup.appendChild(printBtn);
        }
    });
}

console.log('Cinema Booking System initialized successfully! 🎬');
document.addEventListener('DOMContentLoaded', function() {
    loadMovies();
    loadBookings();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Modal close when clicking outside
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditModal();
            }
        });
    }
}

// Tab functionality
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked tab
    event.target.classList.add('active');
    
    if (tabName === 'manage') {
        loadBookings();
    }
}

// Load movies from API
async function loadMovies() {
    try {
        const response = await fetch('/api/movies');
        const movies = await response.json();
        
        const movieSelect = document.getElementById('movieSelect');
        movieSelect.innerHTML = '<option value="">Choose a movie...</option>';
        
        movies.forEach(movie => {
            const option = document.createElement('option');
            option.value = movie;
            option.textContent = movie;
            movieSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading movies:', error);
        showAlert('Error loading movies', 'error');
    }
}

// Load show times for selected movie
async function loadShowTimes() {
    const movieSelect = document.getElementById('movieSelect');
    const showTimeSelect = document.getElementById('showTimeSelect');
    
    currentMovie = movieSelect.value;
    
    if (!currentMovie) {
        showTimeSelect.disabled = true;
        showTimeSelect.innerHTML = '<option value="">Choose show time...</option>';
        document.getElementById('seatSelection').style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`/api/showtimes/${encodeURIComponent(currentMovie)}`);
        const showTimes = await response.json();
        
        showTimeSelect.innerHTML = '<option value="">Choose show time...</option>';
        
        showTimes.forEach(showTime => {
            const option = document.createElement('option');
            option.value = showTime;
            option.textContent = showTime;
            showTimeSelect.appendChild(option);
        });
        
        showTimeSelect.disabled = false;
    } catch (error) {
        console.error('Error loading show times:', error);
        showAlert('Error loading show times', 'error');
    }
}

// Load seats for selected movie and showtime
async function loadSeats() {
    const showTimeSelect = document.getElementById('showTimeSelect');
    currentShowTime = showTimeSelect.value;
    
    if (!currentShowTime) {
        document.getElementById('seatSelection').style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`/api/seats/${encodeURIComponent(currentMovie)}/${encodeURIComponent(currentShowTime)}`);
        const seats = await response.json();
        
        displaySeats(seats);
        document.getElementById('seatSelection').style.display = 'block';
    } catch (error) {
        console.error('Error loading seats:', error);
        showAlert('Error loading seats', 'error');
    }
}

// Display seats in the layout
function displaySeats(seats) {
    const container = document.getElementById('seatsContainer');
    container.innerHTML = '';

    // Group seats by row
    const seatsByRow = {};
    seats.forEach(seat => {
        const row = seat.seat_number[0];
        if (!seatsByRow[row]) {
            seatsByRow[row] = [];
        }
        seatsByRow[row].push(seat);
    });

    // Create seat layout
    Object.keys(seatsByRow).sort().forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';
        
        const rowLabel = document.createElement('div');
        rowLabel.className = 'row-label';
        rowLabel.textContent = row;
        rowDiv.appendChild(rowLabel);

        seatsByRow[row].sort((a, b) => {
            const aNum = parseInt(a.seat_number.slice(1));
            const bNum = parseInt(b.seat_number.slice(1));
            return aNum - bNum;
        }).forEach(seat => {
            const seatDiv = document.createElement('div');
            seatDiv.className = `seat ${seat.seat_type}`;
            seatDiv.textContent = seat.seat_number.slice(1);
            seatDiv.dataset.seatNumber = seat.seat_number;
            seatDiv.dataset.price = seat.price;
            
            if (seat.is_available) {
                seatDiv.classList.add('available');
                seatDiv.onclick = () => selectSeat(seat.seat_number, seat.price);
            } else {
                seatDiv.classList.add('occupied');
            }
            
            rowDiv.appendChild(seatDiv);
        });

        container.appendChild(rowDiv);
    });
}

// Select a seat
function selectSeat(seatNumber, price) {
    // Remove previous selection
    if (selectedSeat) {
        const prevSeat = document.querySelector(`[data-seat-number="${selectedSeat}"]`);
        if (prevSeat) {
            prevSeat.classList.remove('selected');
        }
    }

    // Select new seat
    const seatDiv = document.querySelector(`[data-seat-number="${seatNumber}"]`);
    seatDiv.classList.add('selected');
    
    selectedSeat = seatNumber;
    
    // Update price display
    document.getElementById('selectedSeat').textContent = seatNumber;
    document.getElementById('totalPrice').textContent = price;
    document.getElementById('priceDisplay').style.display = 'block';
    document.getElementById('bookingForm').style.display = 'block';
}

// Confirm booking
async function confirmBooking() {
    const userName = document.getElementById('userName').value.trim();
    const userEmail = document.getElementById('userEmail').value.trim();
    const userPhone = document.getElementById('userPhone').value.trim();

    if (!userName || !userEmail || !userPhone) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    if (!selectedSeat) {
        showAlert('Please select a seat', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(userPhone.replace(/[\s\-\(\)]/g, ''))) {
        showAlert('Please enter a valid phone number', 'error');
        return;
    }

    const bookingData = {
        userName,
        email: userEmail,
        phone: userPhone,
        movieName: currentMovie,
        showTime: currentShowTime,
        seatNumber: selectedSeat
    };

    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (result.success) {
            showAlert(`Booking confirmed! Booking ID: ${result.bookingId}`, 'success');
            resetBooking();
            loadSeats(); // Refresh seats
        } else {
            showAlert(result.error || 'Booking failed', 'error');
        }
    } catch (error) {
        console.error('Error confirming booking:', error);
        showAlert('Error confirming booking. Please try again.', 'error');
    }
}

// Reset booking form
function resetBooking() {
    selectedSeat = null;
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userPhone').value = '';
    document.getElementById('priceDisplay').style.display = 'none';
    document.getElementById('bookingForm').style.display = 'none';
    
    // Remove seat selection
    const selectedSeats = document.querySelectorAll('.seat.selected');
    selectedSeats.forEach(seat => seat.classList.remove('selected'));
}

// Load all bookings
async function loadBookings() {
    const container = document.getElementById('bookingsContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading bookings...</p></div>';

    try {
        const response = await fetch('/api/bookings');
        const bookings = await response.json();

        if (bookings.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No bookings found</p>';
            return;
        }

        let tableHTML = `
            <table class="bookings-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Customer</th>
                        <th>Movie</th>
                        <th>Show Time</th>
                        <th>Seat</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        bookings.forEach(booking => {
            const statusClass = booking.status === 'confirmed' ? 'status-confirmed' : 'status-cancelled';
            const statusText = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
            
            tableHTML += `
                <tr>
                    <td>#${booking.id}</td>
                    <td>
                        <strong>${escapeHtml(booking.user_name)}</strong><br>
                        <small>${escapeHtml(booking.email)}</small><br>
                        <small>${escapeHtml(booking.phone)}</small>
                    </td>
                    <td>${escapeHtml(booking.movie_name)}</td>
                    <td>${escapeHtml(booking.show_time)}</td>
                    <td>
                        ${escapeHtml(booking.seat_number)}
                        <span style="font-size: 0.8em; color: #666;">(${escapeHtml(booking.seat_type)})</span>
                    </td>
                    <td>₹${booking.price}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-warning" onclick="editBooking(${booking.id})">Edit</button>
                            ${booking.status === 'confirmed' ? 
                                `<button class="btn btn-secondary" onclick="cancelBooking(${booking.id})">Cancel</button>` : 
                                ''
                            }
                            <button class="btn btn-danger" onclick="deleteBooking(${booking.id})">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;

    } catch (error) {
        console.error('Error loading bookings:', error);
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #f44336;">Error loading bookings. Please refresh the page.</p>';
    }
}

// Edit booking
async function editBooking(bookingId) {
    try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        const booking = await response.json();

        currentBookingId = bookingId;
        document.getElementById('editUserName').value = booking.user_name;
        document.getElementById('editUserEmail').value = booking.email;
        document.getElementById('editUserPhone').value = booking.phone;
        
        document.getElementById('editModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading booking for edit:', error);
        showAlert('Error loading booking details', 'error');
    }
}

// Update booking
async function updateBooking() {
    if (!currentBookingId) return;

    const userData = {
        userName: document.getElementById('editUserName').value.trim(),
        email: document.getElementById('editUserEmail').value.trim(),
        phone: document.getElementById('editUserPhone').value.trim()
    };

    if (!userData.userName || !userData.email || !userData.phone) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }

    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(userData.phone.replace(/[\s\-\(\)]/g, ''))) {
        showAlert('Please enter a valid phone number', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/bookings/${currentBookingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Booking updated successfully', 'success');
            closeEditModal();
            loadBookings();
        } else {
            showAlert(result.error || 'Update failed', 'error');
        }
    } catch (error) {
        console.error('Error updating booking:', error);
        showAlert('Error updating booking', 'error');
    }
}

// Cancel booking
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
        const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: 'PUT'
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Booking cancelled successfully', 'success');
            loadBookings();
        } else {
            showAlert(result.error || 'Cancellation failed', 'error');
        }
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showAlert('Error cancelling booking', 'error');
    }
}

// Delete booking
async function deleteBooking(bookingId) {
    if (!confirm('Are you sure you want to permanently delete this booking?')) return;

    try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Booking deleted successfully', 'success');
            loadBookings();
        } else {
            showAlert(result.error || 'Deletion failed', 'error');
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        showAlert('Error deleting booking', 'error');
    }
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentBookingId = null;
}

// Show alert message
function showAlert(message, type) {
    const alertDiv = document.getElementById('bookingAlert');
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    
    alertDiv.innerHTML = `<div class="alert ${alertClass}">${escapeHtml(message)}</div>`;
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        alertDiv.innerHTML = '';
    }, 5000);
}

// Utility function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Utility function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Utility function for API error handling
function handleApiError(error) {
    console.error('API Error:', error);
    if (error.message.includes('fetch')) {
        showAlert('Network error. Please check your connection.', 'error');
    } else {
        showAlert('An unexpected error occurred. Please try again.', 'error');
    }
}

// Add loading state for buttons
function setButtonLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (isLoading) {
            button.disabled = true;
            button.textContent = 'Loading...';
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || 'Submit';
        }
    }
}

// Initialize