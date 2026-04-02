---
name: VTTech Synchronization
description: Instructions and credentials for synchronizing data from the VTTech CRM portal.
---

# VTTech Synchronization Skill

This skill provides instructions for authenticating and synchronizing data from the VTTech CRM portal at `https://tmtaza.vttechsolution.com`.

## 🔐 Credentials & Access

- **Access URL:** `https://tmtaza.vttechsolution.com/Login/Login?ver=1775098382869`
- **Username:** `ittest123`
- **Password:** `ittest123`

## 📡 API Endpoints

- **Login API:** `/api/Author/Login`
- **Login Page (Form):** `/Login/Login/`
- **Marketing/PBX Config:** `/marketing/ticketgeneral/`
- **Call History:** `/marketing/call/historycall/`

## ⚙️ Authentication Mechanism

The system uses a **Form-style JSON Login**:
1. Get the dynamic `IP` token from the `/Login/Login/` page (regex: `[a-zA-Z0-9+/]{40,}=`).
2. POST to `/api/Author/Login` with:
   ```json
   {
     "UserName": "ittest123",
     "Password": "ittest123",
     "IP": "{dynamic_token}",
     "Lan": "vi"
   }
   ```
3. Set the returned `Session` in the `WebToken` cookie for subsequent portal requests.
4. Establish the session by hitting the home page `/` before calling handlers.

## 📄 Important Handlers

- **Ticket Groups:** `/marketing/ticketgeneral/?handler=LoadIni`
- **Extensions:** `/marketing/ticketgeneral/?handler=LoadIni`
- **Call History:** `/marketing/call/historycall/?handler=LoadData`
