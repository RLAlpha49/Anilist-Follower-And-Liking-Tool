# Nakama - AniList Relationship Manager

Nakama is a desktop application built with Electron and React that helps AniList users manage their social relationships and engagement on the platform.

## Features

### Relationship Management

- Find users who aren't following you back
- Discover users you're not following back
- Perform bulk unfollow/follow actions
- Manage exclusion lists for important accounts

### Activity Interactions

- Like followed users' activities
- Auto-like following feed
- Customize liking intervals
- Filter by activity types

### Smart Follow

- Follow random users from the global feed
- Get smart followback suggestions
- Activity-based following
- Follow rate limiting to avoid triggering AniList limits

### Analytics

- Track follower and following counts
- Monitor engagement metrics
- Visualize relationship growth

## Installation

### Requirements

- Node.js 16+
- npm or yarn

### Setup

1. Clone this repository

```bash
git clone https://github.com/RLAlpha49/nakama.git
cd nakama
```

2. Install dependencies

```bash
npm install
# or
yarn
```

3. Start the application in development mode

```bash
npm start
# or
yarn start
```

4. To build for production

```bash
npm run make
# or
yarn make
```

## Authentication

Nakama uses OAuth to connect to your AniList account. You'll need to authenticate the first time you use the application. Your authentication token is stored securely on your machine.

## Technology Stack

- **Framework**: Electron
- **Frontend**: React 19, TypeScript, TailwindCSS
- **State Management**: React Query, Context API
- **Routing**: TanStack Router
- **Testing**: Vitest, Playwright
- **API**: AniList GraphQL API

## Development

### Project Structure

- `/src`: Main application code
  - `/api`: API integration with AniList
  - `/components`: Reusable UI components
  - `/pages`: Application pages/screens
  - `/routes`: Application routing
  - `/utils`: Utility functions
  - `/helpers`: Helper functions
  - `/styles`: Global styles and themes

### Building

The application uses Electron Forge for building and packaging:

```bash
# Package the app
npm run package

# Make distributable
npm run make
```

### Testing

```bash
# Run all tests
npm run test:all

# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
