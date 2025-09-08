const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Database Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '@Sagarmatha321',
  database: process.env.DB_NAME || 'cinema_booking'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
  
  // Create database tables if they don't exist
  createTables();
});

// Create necessary tables
function createTables() {
  const createBookingsTable = `
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      phone VARCHAR(15) NOT NULL,
      movie_name VARCHAR(100) NOT NULL,
      show_time VARCHAR(20) NOT NULL,
      seat_number VARCHAR(10) NOT NULL,
      booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed',
      UNIQUE KEY unique_seat_show (seat_number, show_time, movie_name)
    )
  `;

  const createSeatsTable = `
    CREATE TABLE IF NOT EXISTS seats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      seat_number VARCHAR(10) NOT NULL,
      movie_name VARCHAR(100) NOT NULL,
      show_time VARCHAR(20) NOT NULL,
      is_available BOOLEAN DEFAULT TRUE,
      seat_type ENUM('regular', 'premium') DEFAULT 'regular',
      price DECIMAL(10, 2) DEFAULT 150.00,
      UNIQUE KEY unique_seat (seat_number, show_time, movie_name)
    )
  `;

  db.query(createBookingsTable, (err) => {
    if (err) console.error('Error creating bookings table:', err);
    else console.log('Bookings table ready');
  });

  db.query(createSeatsTable, (err) => {
    if (err) console.error('Error creating seats table:', err);
    else console.log('Seats table ready');
    
    // Initialize seats if table is empty
    initializeSeats();
  });
}

// Initialize seats for demo
function initializeSeats() {
  const checkSeats = 'SELECT COUNT(*) as count FROM seats';
  db.query(checkSeats, (err, results) => {
    if (err) {
      console.error('Error checking seats:', err);
      return;
    }
    
    if (results[0].count === 0) {
      const movies = ['Avengers: Endgame', 'Spider-Man', 'Batman'];
      const showTimes = ['10:00 AM', '2:00 PM', '6:00 PM', '10:00 PM'];
      const seatRows = ['A', 'B', 'C', 'D', 'E'];
      
      movies.forEach(movie => {
        showTimes.forEach(showTime => {
          seatRows.forEach(row => {
            for (let i = 1; i <= 10; i++) {
              const seatNumber = `${row}${i}`;
              const seatType = (row === 'A' || row === 'B') ? 'premium' : 'regular';
              const price = seatType === 'premium' ? 200.00 : 150.00;
              
              const insertSeat = `
                INSERT INTO seats (seat_number, movie_name, show_time, is_available, seat_type, price)
                VALUES (?, ?, ?, TRUE, ?, ?)
              `;
              
              db.query(insertSeat, [seatNumber, movie, showTime, seatType, price], (err) => {
                if (err) console.error('Error inserting seat:', err);
              });
            }
          });
        });
      });
      console.log('Demo seats initialized');
    }
  });
}

// Routes

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all available movies
app.get('/api/movies', (req, res) => {
  const query = 'SELECT DISTINCT movie_name FROM seats ORDER BY movie_name';
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch movies' });
      return;
    }
    res.json(results.map(row => row.movie_name));
  });
});

// Get show times for a specific movie
app.get('/api/showtimes/:movie', (req, res) => {
  const movie = req.params.movie;
  const query = 'SELECT DISTINCT show_time FROM seats WHERE movie_name = ? ORDER BY show_time';
  
  db.query(query, [movie], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch show times' });
      return;
    }
    res.json(results.map(row => row.show_time));
  });
});

// Get seats for a specific movie and show time
app.get('/api/seats/:movie/:showtime', (req, res) => {
  const { movie, showtime } = req.params;
  const query = `
    SELECT seat_number, is_available, seat_type, price 
    FROM seats 
    WHERE movie_name = ? AND show_time = ? 
    ORDER BY seat_number
  `;
  
  db.query(query, [movie, showtime], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch seats' });
      return;
    }
    res.json(results);
  });
});

// Book a seat (CREATE)
app.post('/api/bookings', (req, res) => {
  const { userName, email, phone, movieName, showTime, seatNumber } = req.body;
  
  // Start transaction
  db.beginTransaction((err) => {
    if (err) {
      res.status(500).json({ error: 'Transaction failed' });
      return;
    }
    
    // Check if seat is available
    const checkSeat = 'SELECT is_available FROM seats WHERE seat_number = ? AND movie_name = ? AND show_time = ?';
    
    db.query(checkSeat, [seatNumber, movieName, showTime], (err, results) => {
      if (err || results.length === 0) {
        db.rollback();
        res.status(400).json({ error: 'Seat not found' });
        return;
      }
      
      if (!results[0].is_available) {
        db.rollback();
        res.status(400).json({ error: 'Seat already booked' });
        return;
      }
      
      // Create booking
      const createBooking = `
        INSERT INTO bookings (user_name, email, phone, movie_name, show_time, seat_number)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.query(createBooking, [userName, email, phone, movieName, showTime, seatNumber], (err, bookingResult) => {
        if (err) {
          db.rollback();
          res.status(500).json({ error: 'Failed to create booking' });
          return;
        }
        
        // Update seat availability
        const updateSeat = 'UPDATE seats SET is_available = FALSE WHERE seat_number = ? AND movie_name = ? AND show_time = ?';
        
        db.query(updateSeat, [seatNumber, movieName, showTime], (err) => {
          if (err) {
            db.rollback();
            res.status(500).json({ error: 'Failed to update seat' });
            return;
          }
          
          db.commit((err) => {
            if (err) {
              db.rollback();
              res.status(500).json({ error: 'Failed to commit transaction' });
              return;
            }
            
            res.json({
              success: true,
              message: 'Booking confirmed',
              bookingId: bookingResult.insertId
            });
          });
        });
      });
    });
  });
});

// Get all bookings (READ)
app.get('/api/bookings', (req, res) => {
  const query = `
    SELECT b.*, s.price, s.seat_type 
    FROM bookings b 
    JOIN seats s ON b.seat_number = s.seat_number 
      AND b.movie_name = s.movie_name 
      AND b.show_time = s.show_time 
    ORDER BY b.booking_date DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch bookings' });
      return;
    }
    res.json(results);
  });
});

// Get booking by ID (READ)
app.get('/api/bookings/:id', (req, res) => {
  const bookingId = req.params.id;
  const query = `
    SELECT b.*, s.price, s.seat_type 
    FROM bookings b 
    JOIN seats s ON b.seat_number = s.seat_number 
      AND b.movie_name = s.movie_name 
      AND b.show_time = s.show_time 
    WHERE b.id = ?
  `;
  
  db.query(query, [bookingId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch booking' });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    
    res.json(results[0]);
  });
});

// Update booking (UPDATE)
app.put('/api/bookings/:id', (req, res) => {
  const bookingId = req.params.id;
  const { userName, email, phone } = req.body;
  
  const query = 'UPDATE bookings SET user_name = ?, email = ?, phone = ? WHERE id = ?';
  
  db.query(query, [userName, email, phone, bookingId], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to update booking' });
      return;
    }
    
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    
    res.json({ success: true, message: 'Booking updated successfully' });
  });
});

// Cancel booking (UPDATE status)
app.put('/api/bookings/:id/cancel', (req, res) => {
  const bookingId = req.params.id;
  
  db.beginTransaction((err) => {
    if (err) {
      res.status(500).json({ error: 'Transaction failed' });
      return;
    }
    
    // Get booking details
    const getBooking = 'SELECT * FROM bookings WHERE id = ? AND status = "confirmed"';
    
    db.query(getBooking, [bookingId], (err, results) => {
      if (err || results.length === 0) {
        db.rollback();
        res.status(404).json({ error: 'Booking not found or already cancelled' });
        return;
      }
      
      const booking = results[0];
      
      // Update booking status
      const updateBooking = 'UPDATE bookings SET status = "cancelled" WHERE id = ?';
      
      db.query(updateBooking, [bookingId], (err) => {
        if (err) {
          db.rollback();
          res.status(500).json({ error: 'Failed to cancel booking' });
          return;
        }
        
        // Make seat available again
        const updateSeat = 'UPDATE seats SET is_available = TRUE WHERE seat_number = ? AND movie_name = ? AND show_time = ?';
        
        db.query(updateSeat, [booking.seat_number, booking.movie_name, booking.show_time], (err) => {
          if (err) {
            db.rollback();
            res.status(500).json({ error: 'Failed to update seat availability' });
            return;
          }
          
          db.commit((err) => {
            if (err) {
              db.rollback();
              res.status(500).json({ error: 'Failed to commit transaction' });
              return;
            }
            
            res.json({ success: true, message: 'Booking cancelled successfully' });
          });
        });
      });
    });
  });
});

// Delete booking (DELETE)
app.delete('/api/bookings/:id', (req, res) => {
  const bookingId = req.params.id;
  
  db.beginTransaction((err) => {
    if (err) {
      res.status(500).json({ error: 'Transaction failed' });
      return;
    }
    
    // Get booking details
    const getBooking = 'SELECT * FROM bookings WHERE id = ?';
    
    db.query(getBooking, [bookingId], (err, results) => {
      if (err || results.length === 0) {
        db.rollback();
        res.status(404).json({ error: 'Booking not found' });
        return;
      }
      
      const booking = results[0];
      
      // Delete booking
      const deleteBooking = 'DELETE FROM bookings WHERE id = ?';
      
      db.query(deleteBooking, [bookingId], (err) => {
        if (err) {
          db.rollback();
          res.status(500).json({ error: 'Failed to delete booking' });
          return;
        }
        
        // Make seat available again (only if booking was confirmed)
        if (booking.status === 'confirmed') {
          const updateSeat = 'UPDATE seats SET is_available = TRUE WHERE seat_number = ? AND movie_name = ? AND show_time = ?';
          
          db.query(updateSeat, [booking.seat_number, booking.movie_name, booking.show_time], (err) => {
            if (err) {
              db.rollback();
              res.status(500).json({ error: 'Failed to update seat availability' });
              return;
            }
            
            db.commit((err) => {
              if (err) {
                db.rollback();
                res.status(500).json({ error: 'Failed to commit transaction' });
                return;
              }
              
              res.json({ success: true, message: 'Booking deleted successfully' });
            });
          });
        } else {
          db.commit((err) => {
            if (err) {
              db.rollback();
              res.status(500).json({ error: 'Failed to commit transaction' });
              return;
            }
            
            res.json({ success: true, message: 'Booking deleted successfully' });
          });
        }
      });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});