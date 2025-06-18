# GitHub Integration Frontend (Angular 19 + Material + AG Grid)

This is the frontend Angular application for the GitHub Integration project. It allows users to authenticate with GitHub, fetch and display repository-related data, and interact with the data dynamically using AG Grid.

---

## 🚀 Features

### 🔐 Task 1: GitHub OAuth Integration
- GitHub OAuth 2.0 authentication
- Redirects to GitHub for login via "Connect" button
- Stores authentication data in MongoDB
- Displays success status, integration date, and green check if already connected
- Mat Expansion Panel with "Remove Integration" option
- Allows reconnection after disconnection

### 📊 Task 2: GitHub Data Display & Advanced UI
- Displays GitHub data: repositories, commits, pull requests, issues, changelogs, users
- Fully dynamic **AG Grid**:
  - Dynamic column generation (e.g., `author_name`, `author_id`)
  - Filters, pagination, and sorting for large datasets
- Dropdown for active integrations (`GitHub`)
- Dropdown for GitHub data collections (`repos`, `commits`, `issues`, etc.)
- Global search across all fields and columns
- Faceted/custom filtering (date ranges, status, etc.)
- "Find User" hyperlink for ticket traceability:
  - Opens AG Grid in new tab with user + ticket details
- Relationship Builder:
  - Combines related data from multiple collections
  - Expandable rows to show related commits, issues, PRs
- Responsive design and mobile-friendly layout
- Custom cell rendering (e.g., avatars, icons)

---

## 🧱 Tech Stack

- Angular 19
- Angular Material
- AG Grid
- RxJS & HttpClient for API communication
- SCSS for styling


![image](https://github.com/user-attachments/assets/718ef59e-1471-4c2d-b7c4-d7d31ad6e421)
![image](https://github.com/user-attachments/assets/798afc49-b666-4e15-8e33-4acc8f8ba142)
![image](https://github.com/user-attachments/assets/6f6b76fa-c0dd-4728-a824-ca93044ae3db)
![image](https://github.com/user-attachments/assets/03392815-90e6-4043-8a9d-4c9b759bf108)
![image](https://github.com/user-attachments/assets/901f9b3d-9fd9-4ac9-8eac-ada250fa0bc3)
![image](https://github.com/user-attachments/assets/6b173b7d-a65d-43dc-a945-34ec749f5105)
![image](https://github.com/user-attachments/assets/9c2243ec-0390-4e8f-9c8d-25790ac8caa2)
![image](https://github.com/user-attachments/assets/923131bc-ee70-41ff-81b5-fbe31fd1ed25)
![image](https://github.com/user-attachments/assets/72eaf1de-ceb5-4e48-9b00-ca3be6f5948f)








