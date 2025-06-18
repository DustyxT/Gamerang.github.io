# 🎮 Gamerang - Gaming Community & Game Downloads Platform

<div align="center">
  <img src="public/images/weblogo.png" alt="Gamerang Logo" width="200" height="auto">
  
  [![GitHub stars](https://img.shields.io/github/stars/DustyxT/Gamerang?style=social)](https://github.com/DustyxT/Gamerang/stargazers)
  [![GitHub forks](https://img.shields.io/github/forks/DustyxT/Gamerang?style=social)](https://github.com/DustyxT/Gamerang/network/members)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  
  **Your Ultimate Gaming Community Hub**
  
  *Discover, Download, and Discuss PC Games with Fellow Gamers*
</div>

---

## 🌟 About Gamerang

Gamerang is a comprehensive gaming community platform that combines the best of both worlds: **game downloads** and **community engagement**. Built for PC gamers who want access to a vast library of games while connecting with like-minded gaming enthusiasts.

### ✨ What Makes Gamerang Special

- **🎯 Curated Game Library**: Access to a wide selection of PC games with detailed information, screenshots, and system requirements
- **💬 Vibrant Community**: Engage in discussions, share gaming experiences, and connect with fellow gamers
- **🔍 Smart Search**: Advanced filtering and search capabilities to find exactly what you're looking for
- **📱 Responsive Design**: Beautiful, modern interface that works seamlessly across all devices
- **🔐 Secure Platform**: Built with security and user privacy in mind

---

## 🚀 Key Features

### 🎮 Game Downloads
- **Extensive Game Library**: Browse through hundreds of PC games across all genres
- **Detailed Game Pages**: Complete information including:
  - High-quality screenshots and cover images
  - System requirements and compatibility
  - Download sizes and installation notes
  - User ratings and reviews
- **Advanced Filtering**: Search by genre, release date, developer, or file size
- **Quick Downloads**: Fast, reliable download links with progress tracking

### 🌐 Community Forums
- **Discussion Categories**: 
  - General Gaming Discussion
  - Game Reviews & Recommendations
  - Technical Support & Troubleshooting
  - Community Events & Announcements
- **Rich Text Editor**: Create posts with images, formatting, and media
- **User Profiles**: Personalized profiles with activity tracking
- **Real-time Interactions**: Live comments, reactions, and notifications

### 🛡️ User Management
- **Secure Authentication**: Email-based registration with Supabase Auth
- **User Roles**: Standard users and administrators with different permissions
- **Profile Customization**: Avatars, usernames, and personal information
- **Activity Tracking**: Keep track of downloads, posts, and community engagement

---

## 🛠️ Technology Stack

### Frontend
- **HTML5/CSS3**: Modern semantic markup and responsive styling
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Vanilla JavaScript**: Clean, efficient client-side scripting
- **ES6 Modules**: Modular code organization for better maintainability

### Backend & Database
- **Node.js + Express**: Lightweight server for API endpoints and file serving
- **Supabase**: 
  - PostgreSQL database with real-time capabilities
  - User authentication and authorization
  - File storage for images and assets
  - Row Level Security (RLS) for data protection

### Infrastructure
- **File Management**: Organized asset structure with secure file serving
- **Image Optimization**: Efficient image delivery and caching
- **Security**: HTTPS enforcement, input validation, and XSS protection

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Supabase account
- Git

### Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/DustyxT/Gamerang.git
   cd Gamerang
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env-example .env
   # Edit .env with your Supabase credentials
   ```

4. **Database Setup**
   - Run the SQL scripts in your Supabase dashboard:
   ```bash
   # Execute these in order:
   create-forum-tables-safe.sql
   create-site-settings-table.sql
   ```

5. **Start the Server**
   ```bash
   npm start
   # Server will start on http://localhost:3000
   ```

### Environment Variables

Create a `.env` file with the following variables:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
PORT=3000
```

---

## 🎯 Usage Guide

### For Gamers
1. **Browse Games**: Explore the extensive game library on the Games page
2. **Search & Filter**: Use advanced search to find specific titles or genres
3. **Download Games**: Click on any game to view details and download
4. **Join Discussions**: Create an account to participate in community forums
5. **Share Experiences**: Post reviews, screenshots, and gaming tips

### For Community Managers
1. **Create Discussions**: Start new threads in relevant categories
2. **Moderate Content**: Keep discussions on-topic and friendly
3. **Share News**: Post about new game releases and community events
4. **Help Others**: Provide technical support and gaming advice

### For Administrators
1. **User Management**: Manage user accounts and permissions
2. **Content Moderation**: Review and moderate community posts
3. **Site Configuration**: Update site settings and appearance
4. **Analytics**: Monitor site usage and community engagement

---

## 🔧 Admin Features

### Video Background Management
- Upload custom background videos for the forum page
- Automatic video optimization and poster generation
- Admin-only access through the navigation menu

### User Administration
```bash
# Make a user an administrator
node create-admin-user.js user@example.com
```

### Database Management
- Comprehensive SQL scripts for database setup
- Migration scripts for updates and new features
- Backup and restore procedures

---

## 🏗️ Project Structure

```
Gamerang/
├── public/                 # Client-side assets
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript modules
│   ├── images/            # Static images
│   └── *.html             # HTML pages
├── supabase/              # Supabase configuration
│   └── functions/         # Edge functions
├── sql/                   # Database scripts
├── server.js              # Express server
├── package.json           # Dependencies
└── README.md             # This file
```

---

## 🤝 Contributing

We welcome contributions from the gaming community! Here's how you can help:

### Getting Started
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Contribution Areas
- **Frontend**: UI/UX improvements, responsive design enhancements
- **Backend**: API optimizations, new features, security improvements
- **Database**: Schema improvements, query optimizations
- **Documentation**: Guides, tutorials, code comments
- **Testing**: Unit tests, integration tests, user testing

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Supabase** for providing an excellent backend-as-a-service platform
- **Tailwind CSS** for the beautiful and responsive design system
- **The Gaming Community** for inspiration and feedback
- **Open Source Contributors** who make projects like this possible

---

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/DustyxT/Gamerang/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DustyxT/Gamerang/discussions)
- **Email**: Support available through GitHub

---

<div align="center">
  <p><strong>Made with ❤️ for the Gaming Community</strong></p>
  <p>⭐ Star this repository if you find it useful!</p>
</div> 