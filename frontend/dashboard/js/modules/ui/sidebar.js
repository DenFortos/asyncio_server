// frontend/dashboard/js/modules/ui/sidebar.js
export function initializeSidebar() {
    const toggleBtn = document.getElementById('menuToggle');
    console.log("[Sidebar] Init. Toggle button found:", !!toggleBtn);

    if (!toggleBtn) {
        console.warn("[Sidebar] CRITICAL: #menuToggle not found in DOM!");
        return;
    }

    toggleBtn.onclick = (e) => {
        console.log("[Sidebar] Hamburger clicked");
        document.body.classList.toggle('sidebar-hidden');
    };
}