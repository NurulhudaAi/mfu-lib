export type Locale = "th" | "en";

export const translations = {
  th: {
    // User Navbar
    home: "หน้าแรก",
    allBooks: "หนังสือทั้งหมด",
    myBorrows: "การยืมของฉัน",
    feedback: "ความคิดเห็น",
    login: "เข้าสู่ระบบ",
    logout: "ออกจากระบบ",
    admin: "แอดมิน",

    // Admin Nav
    adminDashboard: "แดชบอร์ด",
    adminBooks: "จัดการหนังสือ",
    adminBorrows: "จัดการการยืม",
    adminAnnouncements: "จัดการประกาศ",
    adminFeedback: "Feedback",
    adminUsers: "จัดการสมาชิก",

    // Home
    heroTitle: "ห้องสมุดชมรมมุสลิม",
    heroSubtitle: "MFU Muslim Club Library",
    heroDesc: "ค้นพบหนังสือที่หลากหลาย ยืม-คืนได้ง่าย ๆ ผ่านระบบออนไลน์",
    browseBooks: "เลือกดูหนังสือ",
    newArrival: "หนังสือใหม่",
    viewAll: "ดูทั้งหมด",
    announcement: "ประกาศ",

    // Books
    available: "ว่าง",
    unavailable: "ถูกยืม",
    copies: "เล่ม",
    borrow: "ยืมหนังสือ",
    returnBook: "คืนหนังสือ",
    joinQueue: "จองคิว",
    cancelQueue: "ยกเลิกการจอง",
    queuePosition: "อยู่ในคิวอันดับที่",
    waitingCount: "คนรออยู่",
    cancelBorrow: "ยกเลิกการยืม",

    // My borrows
    activeBorrow: "กำลังยืม",
    history: "ประวัติการยืม-คืน",
    dueDate: "วันครบกำหนดคืน",
    borrowedAt: "วันที่ยืม",
    returnedAt: "วันที่คืน",
    status: "สถานะ",
    returnProof: "รูปหลักฐาน",
    viewProof: "ดูรูปหลักฐาน",
    noBorrows: "ยังไม่มีประวัติการยืม",
    overdue: "เกินกำหนด",
    returned: "คืนแล้ว",
    active: "กำลังยืม",

    // Return
    returnTitle: "คืนหนังสือ",
    selectReturnDate: "เลือกวันที่คืน",
    uploadProof: "รูปหลักฐาน",
    uploadProofHint: "ถ่ายรูปหน้าปกหนังสือในสภาพดี",
    confirmReturn: "ยืนยันการคืน",

    // Feedback
    feedbackTitle: "แสดงความคิดเห็น",
    feedbackDesc: "ช่วยเราพัฒนาห้องสมุดให้ดียิ่งขึ้น",
    yourFeedback: "ความคิดเห็นของคุณ",
    rating: "คะแนน",
    submit: "ส่ง",
    thankYou: "ขอบคุณสำหรับความคิดเห็น",
    feedbackPlaceholder: "แบ่งปันความคิดเห็น ข้อเสนอแนะ หรือรายงานปัญหา...",
    feedbackCategory: "ประเภท",
    feedbackGeneral: "ทั่วไป",
    feedbackBookRequest: "ขอเพิ่มหนังสือ",
    feedbackSystem: "ระบบ",
    feedbackService: "บริการ",
    feedbackAlert: "กรุณาให้คะแนนและเขียนความคิดเห็น",
    feedbackResubmit: "ส่งอีกครั้ง",
    feedbackValue: "ความคิดเห็นของคุณมีคุณค่ามากสำหรับเรา",
    rating1: "แย่มาก",
    rating2: "แย่",
    rating3: "ปานกลาง",
    rating4: "ดี",
    rating5: "ดีมาก",

    // Login
    loginTitle: "เข้าสู่ระบบ",
    loginSubtitle: "ห้องสมุดชมรมมุสลิม MFU",
    loginWithGoogle: "เข้าสู่ระบบด้วย Google",
    loginDesc: "ใช้บัญชี Google ของคุณเพื่อเข้าสู่ระบบ",

    // General
    loading: "กำลังโหลด...",
    error: "เกิดข้อผิดพลาด",
    success: "สำเร็จ",
    cancel: "ยกเลิก",
    confirm: "ยืนยัน",
    close: "ปิด",
    search: "ค้นหา",
    searchPlaceholder: "ค้นหาหนังสือ...",
    darkMode: "โหมดมืด",
    lightMode: "โหมดสว่าง",
    language: "ภาษา",
  },
  en: {
    // Navbar
    home: "Home",
    allBooks: "All Books",
    myBorrows: "My Borrows",
    feedback: "Feedback",
    login: "Login",
    logout: "Logout",
    admin: "Admin",

    // Admin Nav
    adminDashboard: "Dashboard",
    adminBooks: "Manage Books",
    adminBorrows: "Manage Borrows",
    adminAnnouncements: "Announcements",
    adminFeedback: "Feedback",
    adminUsers: "Manage Users",

    // Home
    heroTitle: "Muslim Club Library",
    heroSubtitle: "MFU Muslim Club Library",
    heroDesc:
      "Discover a wide range of books. Borrow and return easily through our online system.",
    browseBooks: "Browse Books",
    newArrival: "New Arrivals",
    viewAll: "View All",
    announcement: "Announcement",

    // Books
    available: "Available",
    unavailable: "Borrowed",
    copies: "copies",
    borrow: "Borrow",
    returnBook: "Return Book",
    joinQueue: "Join Queue",
    cancelQueue: "Cancel Queue",
    queuePosition: "Queue position",
    waitingCount: "people waiting",
    cancelBorrow: "Cancel Borrow",

    // My borrows
    activeBorrow: "Currently Borrowing",
    history: "Borrow History",
    dueDate: "Due Date",
    borrowedAt: "Borrowed On",
    returnedAt: "Returned On",
    status: "Status",
    returnProof: "Return Proof",
    viewProof: "View Proof",
    noBorrows: "No borrow history yet",
    overdue: "Overdue",
    returned: "Returned",
    active: "Active",

    // Return
    returnTitle: "Return Book",
    selectReturnDate: "Select Return Date",
    uploadProof: "Return Proof Photo",
    uploadProofHint: "Take a photo of the book cover in good condition",
    confirmReturn: "Confirm Return",

    // Feedback
    feedbackTitle: "Share Your Feedback",
    feedbackDesc: "Help us improve the library experience",
    yourFeedback: "Your Feedback",
    rating: "Rating",
    submit: "Submit",
    thankYou: "Thank you for your feedback!",
    feedbackPlaceholder:
      "Share your thoughts, suggestions, or report an issue...",
    feedbackCategory: "Category",
    feedbackGeneral: "General",
    feedbackBookRequest: "Book Request",
    feedbackSystem: "System",
    feedbackService: "Service",
    feedbackAlert: "Please provide a rating and your feedback",
    feedbackResubmit: "Submit Again",
    feedbackValue: "Your feedback is highly valued",
    rating1: "Terrible",
    rating2: "Bad",
    rating3: "Average",
    rating4: "Good",
    rating5: "Excellent",

    // Login
    loginTitle: "Sign In",
    loginSubtitle: "MFU Muslim Club Library",
    loginWithGoogle: "Sign in with Google",
    loginDesc: "Use your Google account to sign in",

    // General
    loading: "Loading...",
    error: "Error occurred",
    success: "Success",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    search: "Search",
    searchPlaceholder: "Search books...",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    language: "Language",
  },
};

export type TranslationKey = keyof typeof translations.th;
