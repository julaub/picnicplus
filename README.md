# Event Finder 🎉

Event Finder is a full-stack web application designed to help you discover the perfect outdoor spots for gatherings and seamlessly organize them with your friends.

Whether you need a location with specific amenities like fire pits and water, or want to coordinate a potluck without the hassle of group chats, Event Finder has you covered.

## ✨ Features

### 🗺️ Discover Perfect Spots
- **Interactive Map:** Explore locations using a beautiful, dark-mode Leaflet map.
- **Amenity Filtering:** Search for spots that have exactly what you need (e.g., Fire Pits, Drinking Water, Shelters, Playgrounds, Toilets).
- **Smart Clustering:** The app queries real-time OpenStreetMap data via the Overpass API to find areas where your desired amenities are clustered together.
- **Proximity Conditions:** Want an event spot that's also within 150m of a bus stop or a supermarket? You can add custom proximity filters to find the most convenient locations.

### 👥 Organize and Invite
- **Create Events:** Found the perfect spot on the map? Click to drop a pin and create a new event.
- **Secret URLs:** Generate a unique, shareable link to invite friends. Only people with the link can join.
- **Guest List Management:** See exactly who has RSVP'd and who is organizing the event.

### 🍔 Tasks & Items Coordination
- **Collaborative List:** Add items that are needed for the picnic (e.g., "Burger Buns", "Soda", "Vegetarian Skewers").
- **Claim Items:** Guests can easily claim items they plan to bring, preventing duplicate dishes.
- **Live Status:** The Event Dashboard gives a quick overview of how many items are covered versus how many are still needed.

## 🛠️ Technology Stack

**Frontend:**
- HTML5, CSS3 (Custom Premium Design System, Fully Responsive)
- Vanilla JavaScript (ES6+ Modules)
- Leaflet.js (Interactive Maps)
- Overpass API (OpenStreetMap Data)

**Backend:**
- Node.js
- Express.js
- MySQL (Persistent Storage for Events, Guests, and Tasks & Items Items)

## 🚀 Getting Started

### Prerequisites
- Node.js installed on your machine
- MySQL Server installed and running

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd picnic-finder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   - Create a MySQL database (e.g., `picnic_db`).
   - Run the provided `schema.sql` file to create the necessary tables (`picnics`, `participants`, `potluck_items`).
   - Configure your database connection in the `.env` file:
     ```env
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=yourpassword
     DB_NAME=picnic_db
     PORT=3000
     ```

4. **Start the server**
   ```bash
   npm start
   ```
   *(For development, you can use `npm run dev` if you have nodemon configured).*

5. **Open the App**
   Navigate to `http://localhost:3000` in your web browser.

## 📱 Mobile Experience
Event Finder is fully responsive. On mobile devices, the interface transforms to provide a seamless, app-like experience with a bottom navigation bar and full-screen swipeable panels for the map, guest list, and potluck tracker.

---
*Built for outdoor enthusiasts and designated organizers.* 🌳
