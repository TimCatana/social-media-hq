- Broken link checker for Pinterest
- trend analysis for hashtags (get seasonal hashtags with peak season, get hashtags that are beginning to trend)

src/
├── auth/                    # Authentication logic for each platform
│   ├── facebook.js
│   ├── instagram.js
│   ├── pinterest.js
│   ├── rumble.js
│   ├── tiktok.js
│   ├── twitter.js
│   ├── youtube.js
│   └── tokenManager.js      # Generic token management logic
├── platforms/               # Platform-specific logic
│   ├── facebook/
│   │   ├── accountPosts.js
│   │   ├── topPosts.js
│   │   └── config.js        # Platform-specific configs (API fields, CSV formats)
│   ├── instagram/
│   │   ├── accountPosts.js
│   │   ├── topPosts.js
│   │   └── config.js
│   ├── pinterest/
│   │   ├── accountPosts.js
│   │   ├── topPosts.js
│   │   └── config.js
│   ├── rumble/
│   │   ├── accountPosts.js
│   │   ├── topPosts.js
│   │   └── config.js
│   ├── threads/
│   │   ├── accountPosts.js
│   │   ├── topPosts.js
│   │   └── config.js
│   ├── tiktok/
│   │   ├── accountPosts.js
│   │   ├── topPosts.js
│   │   └── config.js
│   ├── twitter/
│   │   ├── accountPosts.js
│   │   ├── topPosts.js
│   │   └── config.js
│   └── youtube/
│       ├── accountPosts.js
│       ├── topPosts.js
│       └── config.js
├── features/                # User interaction workflows
│   ├── accountPosts.js
│   ├── topPosts.js
│   └── scheduling.js        # Placeholder for scheduling logic
├── utils/                   # Shared utility functions
│   ├── apiUtils.js          # API request helpers
│   ├── csvUtils.js          # CSV generation helpers
│   ├── promptUtils.js       # Prompt-related helpers
│   ├── logUtils.js          # Logging utilities
│   └── configUtils.js       # Config loading/saving
├── constants.js             # Global constants (platforms, metrics)
└── main.js                  # Entry point and main menu