1. Truy Cập 
https://tmtaza.vttechsolution.com/Login/Login?ver=1775234496087
Điền username : ittest123
Mật Khẩu : ittest123

2. Gọi API
https://tmtaza.vttechsolution.com/api/Author/Login
payload
{
    "UserName": "ittest123",
    "Password": "yjvi9gXUjVgk9Hz58jU9fN3v/S6qVWInMKlhrHtMLi0=",
    "PasswordEnCrypt": "yjvi9gXUjVgk9Hz58jU9fN3v/S6qVWInMKlhrHtMLi0=",
    "IP": "pFRFXcMJCmdfmyrq4C0FijOhsgRZ1pxqZAxc2oIOtno=",
    "TokenFCM": "cGeJhKRfuMkvPRLks58UV_:APA91bGEljuI-CBsdCiLn9X-3EkkObqKN6S4omY0DAvpAIMbsb0b3A6sJ44P6fj90_TfJlE-faVt9lT_By9IRFRgoY5ENKZXjxiD-B1TZHdwX9zO6or52IU",
    "From": "",
    "SSO": "",
    "Lan": "vi",
    "TokenSSO": ""
}


3. Gọi API Khác Sau khi đăng nhập

https://tmtaza.vttechsolution.com/Master/Master_Top/?handler=NotiItemCount

cookie : 
.AspNetCore.Culture=c%3Den-US%7Cuic%3Dvi; .AspNetCore.Antiforgery.yCr0Ige0lxA=CfDJ8CbdI892TW5JrNIMb4RXqWblbwKeENEtnv6nMjSXmRLsr1O9POO6Y6D45ynqnHtxqJXN5EgajAes-znCqHVf_3epNjy985H9EB4NJDldB6eVvO2mWU-XhWQ96bsGs8YajaC6THltHMnbaoYc5Iv0XF8; .AspNetCore.Session=CfDJ8CbdI892TW5JrNIMb4RXqWatxW69cCC8Xn61t8ofLX8Izqm2mgepaD2mXxhPh8ZbgmOrSCEO%2F%2F5QAIya6QP0oLpRwPSlxeeVdhhgtfa9FsmH0qIzMcoN0S1up2Z%2BJsh%2F3BAaVAv%2Fl3G5VxRdhtynoA6p9jy0VnxkBK1nK5AEMDvR; VTTECH_Menu_SideBarIsHide=false; WebToken=eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjpbIml0dGVzdDEyMyIsIml0dGVzdDEyMyJdLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJ3ZWJhcHAiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjMyNCIsImV4cCI6MTc3NTI4ODk3MSwiaXNzIjoidnR0ZWNoc29sdXRpb24iLCJhdWQiOiJ2dHRlY2hzb2x1dGlvbiJ9.obVWgFl26Ii26zoPcgoWDo9n5q12Rxvmo2R5PqZQQCc

xsrf-token :
CfDJ8CbdI892TW5JrNIMb4RXqWZm12kWNrgEQH4tffYfny9CbLK49c9T52jIT9YV7EEk9rgr7McCeQgubtfsPr5VzbbOjUe8i-ODlgqiWDjq1_e-BSbiCApTvL1BccNpzF2lp1HdRqZ9PKB2YbmdHnkwwmE

payload : handler=NotiItemCount
reponse : H4sIAAAAAAAACouuVvIrzU1KLYoPzQtKTUxRsjKojQUAvhQmSRUAAAA=



https://tmtaza.vttechsolution.com/Customer/ListCustomer/?handler=LoadData

handler=LoadData

dateFrom=2026-04-04+00%3A00%3A00&dateTo=2026-04-04+00%3A00%3A00&branchID=1&type=5&BeginID=0&BeginCustID=0&Limit=500