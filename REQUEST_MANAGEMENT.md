# Reswob HTTP Client - Request Management

## Saving and Managing Requests

The Reswob HTTP Client extension now supports saving, importing, and exporting HTTP requests for version control and team collaboration.

### Features

#### 1. **Save Requests**
- Fill out your HTTP request (method, URL, headers, body)
- Click the "💾 Save Request" button
- Enter a name for your request
- The request is saved to `.reswob-requests/requests.json` in your workspace

#### 2. **Load Saved Requests**
- View saved requests in the sidebar panel
- Click on any saved request to load it into the HTTP client
- Requests show the method and URL for easy identification

#### 3. **Sidebar Management**
- Click the globe icon in the activity bar to open the Reswob HTTP Client
- The sidebar shows:
  - "+ New Request" - opens a blank HTTP client
  - List of all saved requests
- Click on any saved request to load and edit it

#### 4. **Delete Requests**
- In the HTTP client webview, click the "×" button next to any saved request
- Confirm deletion in the popup dialog

#### 5. **Export/Import**
- **Export**: Use Command Palette → "Export All Requests" to save all requests to a JSON file
- **Import**: Use Command Palette → "Import Requests" to load requests from a JSON file
- This is useful for sharing request collections between team members

### Version Control Integration

#### Request Storage
Requests are stored in `.reswob-requests/requests.json` in your workspace root:

\`\`\`json
{
  "version": "1.0.0",
  "requests": [
    {
      "name": "Get Users",
      "method": "GET",
      "url": "https://api.example.com/users",
      "headers": {
        "Authorization": "Bearer token"
      },
      "body": "",
      "timestamp": "2025-07-18T10:30:00.000Z"
    }
  ]
}
\`\`\`

#### Git Integration
1. **Include requests in version control**: Commit the `.reswob-requests/` folder
2. **Team collaboration**: Team members can share request collections
3. **Branch-specific requests**: Different branches can have different request sets
4. **History tracking**: See how API requests evolve over time

#### Recommended .gitignore
Make sure your `.gitignore` does NOT exclude the `.reswob-requests/` folder:

\`\`\`gitignore
# Include request collections for team sharing
# .reswob-requests/ - DO NOT uncomment this line
\`\`\`

### Usage Examples

#### Individual Development
1. Create requests for your API endpoints
2. Save them with descriptive names
3. Commit to version control
4. Switch between requests as needed

#### Team Collaboration
1. One team member creates a comprehensive request collection
2. Export the collection or commit the `.reswob-requests/` folder
3. Other team members pull the changes
4. Everyone has access to the same request collection

#### API Documentation
1. Create requests for all API endpoints
2. Use descriptive names and include example data
3. Commit to the repository
4. New team members have working examples immediately

### File Structure
\`\`\`
your-project/
├── .reswob-requests/
│   └── requests.json          # All saved requests
├── src/
├── package.json
└── README.md
\`\`\`

### Commands
- `reswob-http-client.openHttpClient` - Open HTTP Client
- `reswob-http-client.exportRequests` - Export requests to file
- `reswob-http-client.importRequests` - Import requests from file
- `reswob-http-client.saveRequest` - Save current request (available in webview)
- `reswob-http-client.loadRequest` - Load saved request (available in sidebar)
