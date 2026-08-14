/* =========================================================
   IOIS PLATFORM — auth.js
   Indian Online Income Supporting System
   ---------------------------------------------------------
   Handles:
   • Supabase authentication
   • Login / Logout
   • Registration
   • Forgot password
   • Password reset
   • Current session
   • User profile loading
   • Profile update
   • Unique User ID protection
   • Membership selection
   • Dashboard protection
   • Admin-page protection
   • Registration redirect
   • Auth state monitoring
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       1. SUPABASE CONFIGURATION
       =====================================================

       अपनी पहले से बनाई हुई Supabase project की values
       यहाँ रखें।

       केवल ANON/PUBLIC KEY इस्तेमाल करें।

       NEVER:
       • service_role key
       • Telegram bot token
       • private API key
       frontend में डालें।
    ===================================================== */

    const SUPABASE_URL =
        window.IOIS_SUPABASE_URL ||
        "https://hrvwzviprlnpkhrgzdrc.supabase.co";

    const SUPABASE_ANON_KEY =
        window.IOIS_SUPABASE_ANON_KEY ||
        "sb_publishable_tXoFuC0rz0JeDOQvmpjz7w_ZAJhKOVF";


    /* =====================================================
       2. SUPABASE CLIENT
    ===================================================== */

    let supabaseClient = null;

    function initSupabase() {

        if (typeof window.supabase === "undefined") {
            console.error(
                "IOIS: Supabase JavaScript library नहीं मिली।"
            );
            return null;
        }

        if (
            !SUPABASE_URL ||
            SUPABASE_URL.includes("YOUR_SUPABASE") ||
            !SUPABASE_ANON_KEY ||
            SUPABASE_ANON_KEY.includes("YOUR_SUPABASE")
        ) {
            console.error(
                "IOIS: Supabase URL / ANON KEY configure करें।"
            );
            return null;
        }

        try {

            supabaseClient = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true,
                        storageKey: "iois-auth-session"
                    }
                }
            );

            return supabaseClient;

        } catch (error) {

            console.error(
                "IOIS: Supabase initialization failed:",
                error
            );

            return null;
        }
    }


    /* =====================================================
       3. GLOBAL IOIS AUTH OBJECT
    ===================================================== */

    window.IOISAuth = {

        client: null,

        initialized: false,

        init() {

            if (this.initialized && this.client) {
                return this.client;
            }

            this.client = initSupabase();

            this.initialized = !!this.client;

            return this.client;
        },

        getClient() {

            if (!this.client) {
                this.init();
            }

            return this.client;
        }
    };


    /* =====================================================
       4. HELPERS
    ===================================================== */

    function getClient() {

        return IOISAuth.getClient();
    }


    function showMessage(
        message,
        type = "info"
    ) {

        const old =
            document.getElementById("iois-auth-message");

        if (old) {
            old.remove();
        }

        const box =
            document.createElement("div");

        box.id =
            "iois-auth-message";

        const colors = {

            success:
                "background:#052e16;color:#86efac;border:1px solid #16a34a;",

            error:
                "background:#450a0a;color:#fca5a5;border:1px solid #dc2626;",

            warning:
                "background:#451a03;color:#fcd34d;border:1px solid #d97706;",

            info:
                "background:#082f49;color:#7dd3fc;border:1px solid #0284c7;"
        };

        box.setAttribute(
            "style",
            `
            position:fixed;
            top:20px;
            left:50%;
            transform:translateX(-50%);
            z-index:99999;
            max-width:92%;
            width:max-content;
            padding:13px 18px;
            border-radius:12px;
            font-size:13px;
            font-weight:700;
            box-shadow:0 15px 40px rgba(0,0,0,.45);
            ${colors[type] || colors.info}
            `
        );

        box.textContent = message;

        document.body.appendChild(box);

        setTimeout(() => {

            if (box) {
                box.remove();
            }

        }, 5000);
    }


    function setButtonLoading(
        button,
        loading,
        normalText = "Continue"
    ) {

        if (!button) return;

        if (loading) {

            button.dataset.originalText =
                button.innerHTML;

            button.disabled = true;

            button.innerHTML =
                `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Processing...
                `;

        } else {

            button.disabled = false;

            button.innerHTML =
                button.dataset.originalText ||
                normalText;
        }
    }


    function safeText(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value).trim();
    }


    function normalizePhone(phone) {

        return safeText(phone)
            .replace(/\D/g, "")
            .slice(-10);
    }


    function validPhone(phone) {

        return /^[6-9]\d{9}$/.test(
            normalizePhone(phone)
        );
    }


    function validEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(safeText(email));
    }


    function getPageName() {

        return (
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase()
        );
    }


    /* =====================================================
       5. GET CURRENT SESSION
    ===================================================== */

    async function getSession() {

        const client = getClient();

        if (!client) {
            return null;
        }

        try {

            const {
                data,
                error
            } = await client.auth.getSession();

            if (error) {
                console.error(error);
                return null;
            }

            return data?.session || null;

        } catch (error) {

            console.error(
                "IOIS session error:",
                error
            );

            return null;
        }
    }


    window.IOISAuth.getSession =
        getSession;


    /* =====================================================
       6. GET CURRENT USER
    ===================================================== */

    async function getCurrentUser() {

        const client = getClient();

        if (!client) {
            return null;
        }

        try {

            const {
                data,
                error
            } = await client.auth.getUser();

            if (error) {
                return null;
            }

            return data?.user || null;

        } catch (error) {

            console.error(error);

            return null;
        }
    }


    window.IOISAuth.getCurrentUser =
        getCurrentUser;


    /* =====================================================
       7. LOAD PROFILE
    ===================================================== */

    async function loadProfile(
        userId = null
    ) {

        const client = getClient();

        if (!client) {
            return null;
        }

        const user =
            await getCurrentUser();

        const id =
            userId || user?.id;

        if (!id) {
            return null;
        }

        try {

            const {
                data,
                error
            } = await client
                .from("profiles")
                .select("*")
                .eq("id", id)
                .maybeSingle();

            if (error) {

                console.warn(
                    "IOIS profile load:",
                    error.message
                );

                return null;
            }

            return data;

        } catch (error) {

            console.error(error);

            return null;
        }
    }


    window.IOISAuth.loadProfile =
        loadProfile;


    /* =====================================================
       8. REGISTER USER
    ===================================================== */

    async function registerUser(formData) {

        const client = getClient();

        if (!client) {

            showMessage(
                "Supabase connection उपलब्ध नहीं है।",
                "error"
            );

            return {
                success: false
            };
        }

        const name =
            safeText(formData.fullName);

        const email =
            safeText(formData.email)
                .toLowerCase();

        const phone =
            normalizePhone(formData.phone);

        const password =
            safeText(formData.password);

        const address =
            safeText(formData.address);

        const sponsorName =
            safeText(formData.sponsorName);

        const sponsorId =
            safeText(formData.sponsorId);

        const upi =
            safeText(formData.withdrawalUpi);

        const plan =
            safeText(formData.plan);

        const planCode =
            safeText(formData.planCode);

        const paymentProof =
            safeText(formData.paymentProof);

        const identityProof =
            safeText(formData.identityProof);


        /* ---------- VALIDATION ---------- */

        if (!name) {

            showMessage(
                "कृपया Full Name भरें।",
                "error"
            );

            return {
                success: false
            };
        }


        if (!validEmail(email)) {

            showMessage(
                "कृपया सही Email Address डालें।",
                "error"
            );

            return {
                success: false
            };
        }


        if (!validPhone(phone)) {

            showMessage(
                "कृपया valid 10-digit WhatsApp number डालें।",
                "error"
            );

            return {
                success: false
            };
        }


        if (password.length < 8) {

            showMessage(
                "Password कम से कम 8 characters का होना चाहिए।",
                "error"
            );

            return {
                success: false
            };
        }


        if (!plan) {

            showMessage(
                "Membership plan select करें।",
                "error"
            );

            return {
                success: false
            };
        }


        /* ---------- SUPABASE SIGNUP ---------- */

        try {

            const {
                data,
                error
            } =
                await client.auth.signUp({

                    email,

                    password,

                    options: {

                        data: {

                            full_name:
                                name,

                            phone:
                                phone,

                            address:
                                address,

                            sponsor_name:
                                sponsorName,

                            sponsor_id:
                                sponsorId,

                            withdrawal_upi:
                                upi,

                            selected_plan:
                                plan,

                            plan_code:
                                planCode,

                            payment_proof:
                                paymentProof,

                            identity_proof:
                                identityProof,

                            platform:
                                "IOIS",

                            registration_source:
                                "website"
                        }
                    }
                });


            if (error) {

                console.error(
                    "IOIS signup error:",
                    error
                );

                let msg =
                    error.message ||
                    "Registration failed.";

                if (
                    msg.toLowerCase()
                        .includes("already registered")
                ) {

                    msg =
                        "यह Email पहले से registered है। Login या Forgot Password इस्तेमाल करें।";
                }

                showMessage(
                    msg,
                    "error"
                );

                return {
                    success: false,
                    error
                };
            }


            const user =
                data?.user;


            if (!user) {

                showMessage(
                    "Registration complete नहीं हुआ।",
                    "error"
                );

                return {
                    success: false
                };
            }


            /* ---------- SAVE LOCAL REGISTRATION INFO ---------- */

            try {

                localStorage.setItem(
                    "iois_pending_registration",
                    JSON.stringify({

                        userId:
                            user.id,

                        email:
                            email,

                        phone:
                            phone,

                        name:
                            name,

                        plan:
                            plan,

                        planCode:
                            planCode,

                        createdAt:
                            new Date().toISOString()
                    })
                );

            } catch (_) {}


            showMessage(
                "Registration सफल हुआ। अब payment/verification process पूरा करें।",
                "success"
            );


            return {

                success: true,

                user,

                session:
                    data?.session || null,

                requiresEmailVerification:
                    !data?.session
            };


        } catch (error) {

            console.error(
                "IOIS registration exception:",
                error
            );

            showMessage(
                "Registration के दौरान technical error आया।",
                "error"
            );

            return {
                success: false,
                error
            };
        }
    }


    window.IOISAuth.register =
        registerUser;


    /* =====================================================
       9. LOGIN
    ===================================================== */

    async function loginUser(email, password) {
        const client = getClient();
        if (!client) {
            showMessage("Supabase connection उपलब्ध नहीं है।", "error");
            return { success: false };
        }

        email = safeText(email).trim().toLowerCase();
        password = safeText(password);

        if (!validEmail(email)) {
            showMessage("कृपया registered Email Address डालें।", "error");
            return { success: false };
        }
        if (!password) {
            showMessage("Password डालें।", "error");
            return { success: false };
        }

        try {
            const result = await Promise.race([
                client.auth.signInWithPassword({ email, password }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("LOGIN_TIMEOUT")), 12000))
            ]);

            if (result.error) {
                const m = String(result.error.message || "");
                if (/invalid login credentials/i.test(m)) {
                    showMessage("Email या Password गलत है।", "error");
                } else if (/email not confirmed/i.test(m)) {
                    showMessage("Email confirmation अभी enabled है। Supabase में Confirm email OFF करें।", "error");
                } else if (/rate limit|too many/i.test(m)) {
                    showMessage("बहुत अधिक login attempts हुए हैं। थोड़ी देर बाद फिर प्रयास करें।", "error");
                } else {
                    showMessage(m || "Login नहीं हो सका।", "error");
                }
                return { success: false, error: result.error };
            }

            if (!result.data?.session || !result.data?.user) {
                showMessage("Login session नहीं बन सकी। Supabase Auth settings check करें।", "error");
                return { success: false };
            }

            try { localStorage.setItem("iois_last_login", new Date().toISOString()); } catch (_) {}
            showMessage("Login सफल हुआ। Dashboard खोला जा रहा है...", "success");
            return { success: true, user: result.data.user, session: result.data.session };

        } catch (error) {
            console.error("IOIS normal email login:", error);
            showMessage(
                error?.message === "LOGIN_TIMEOUT"
                    ? "Login में बहुत समय लग रहा है। कृपया फिर प्रयास करें।"
                    : "Login service से connection नहीं हो पाया।",
                "error"
            );
            return { success: false, error };
        }
    }

    window.IOISAuth.login =
        loginUser;


    /* =====================================================
       10. LOGOUT
    ===================================================== */

    async function logoutUser(
        redirect = "login.html"
    ) {

        const client = getClient();

        if (!client) {
            return false;
        }

        try {

            const {
                error
            } =
                await client.auth.signOut();

            if (error) {

                console.error(error);

                showMessage(
                    "Logout failed.",
                    "error"
                );

                return false;
            }


            try {

                localStorage.removeItem(
                    "iois_pending_registration"
                );

            } catch (_) {}


            if (redirect) {

                window.location.href =
                    redirect;
            }

            return true;

        } catch (error) {

            console.error(error);

            return false;
        }
    }


    window.IOISAuth.logout =
        logoutUser;


    /* =====================================================
       11. FORGOT PASSWORD
    ===================================================== */

    async function forgotPassword(email) {
        const client = getClient();
        email = safeText(email).trim().toLowerCase();

        if (!client) {
            showMessage("Supabase connection उपलब्ध नहीं है।", "error");
            return false;
        }
        if (!validEmail(email)) {
            showMessage("कृपया registered Email Address डालें।", "error");
            return false;
        }

        try {
            const redirectTo = new URL("reset-password.html", window.location.href).href;
            const result = await Promise.race([
                client.auth.resetPasswordForEmail(email, { redirectTo }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("RESET_TIMEOUT")), 12000))
            ]);
            if (result.error) throw result.error;
            showMessage("Password reset link आपके registered email पर भेज दिया गया है।", "success");
            return true;
        } catch (error) {
            console.error("IOIS password reset:", error);
            showMessage(
                error?.message === "RESET_TIMEOUT"
                    ? "Password reset request में समय लग रहा है। कृपया फिर प्रयास करें।"
                    : (error?.message || "Password reset नहीं हो सका।"),
                "error"
            );
            return false;
        }
    }

    window.IOISAuth.forgotPassword =
        forgotPassword;


    /* =====================================================
       13. UPDATE PROFILE
       -----------------------------------------------------
       IMPORTANT:
       user_id / unique_user_id को यहाँ update नहीं किया गया।
       यह जानबूझकर immutable रखा गया है।
    ===================================================== */

    async function updateProfile(
        updates
    ) {

        const client = getClient();

        if (!client) {
            return {
                success: false
            };
        }


        const user =
            await getCurrentUser();

        if (!user) {

            showMessage(
                "पहले login करें।",
                "warning"
            );

            return {
                success: false
            };
        }


        const allowedFields = {

            full_name:
                safeText(updates.full_name),

            phone:
                normalizePhone(
                    updates.phone
                ),

            address:
                safeText(updates.address),

            avatar_url:
                safeText(
                    updates.avatar_url
                ),

            sponsor_name:
                safeText(
                    updates.sponsor_name
                ),

            withdrawal_upi:
                safeText(
                    updates.withdrawal_upi
                )
        };


        /* Remove empty optional fields */

        Object.keys(
            allowedFields
        ).forEach(key => {

            if (
                allowedFields[key] === ""
            ) {
                delete allowedFields[key];
            }

        });


        /*
         * IMPORTANT:
         * कभी भी id / unique_user_id / user_id
         * client से update नहीं करेंगे।
         */


        try {

            const {
                data,
                error
            } =
                await client
                    .from("profiles")
                    .update(
                        allowedFields
                    )
                    .eq("id", user.id)
                    .select()
                    .single();


            if (error) {

                console.error(
                    "IOIS profile update:",
                    error
                );

                showMessage(
                    error.message ||
                    "Profile update failed.",
                    "error"
                );

                return {
                    success: false,
                    error
                };
            }


            showMessage(
                "Profile successfully update हो गई।",
                "success"
            );


            return {

                success: true,

                profile:
                    data
            };


        } catch (error) {

            console.error(error);

            return {
                success: false,
                error
            };
        }
    }


    window.IOISAuth.updateProfile =
        updateProfile;


    /* =====================================================
       14. PROTECTED PAGE
    ===================================================== */

    async function requireLogin(
        redirect = "login.html"
    ) {

        const session =
            await getSession();


        if (!session) {

            try {

                sessionStorage.setItem(
                    "iois_after_login",
                    window.location.href
                );

            } catch (_) {}


            window.location.href =
                redirect;

            return null;
        }


        return session;
    }


    window.IOISAuth.requireLogin =
        requireLogin;


    /* =====================================================
       15. REDIRECT AFTER LOGIN
    ===================================================== */

    function getPostLoginRedirect() {

        try {

            const saved =
                sessionStorage.getItem(
                    "iois_after_login"
                );

            if (saved) {

                sessionStorage.removeItem(
                    "iois_after_login"
                );

                return saved;
            }

        } catch (_) {}


        return "dashboard.html";
    }


    window.IOISAuth.getPostLoginRedirect =
        getPostLoginRedirect;


    /* =====================================================
       16. REDIRECT IF ALREADY LOGGED IN
    ===================================================== */

    async function redirectIfLoggedIn(
        redirect = "dashboard.html"
    ) {

        const session =
            await getSession();

        if (session) {

            window.location.href =
                redirect;

            return true;
        }

        return false;
    }


    window.IOISAuth.redirectIfLoggedIn =
        redirectIfLoggedIn;


    /* =====================================================
       17. ADMIN CHECK
       -----------------------------------------------------
       Admin authority database/RLS से verify होना चाहिए।
       Frontend में सिर्फ role देखकर sensitive operation
       perform नहीं करना है।
    ===================================================== */

    async function isAdmin() {

        const client =
            getClient();

        const user =
            await getCurrentUser();

        if (!client || !user) {
            return false;
        }


        try {

            const {
                data,
                error
            } =
                await client
                    .from("profiles")
                    .select("role,is_admin")
                    .eq("id", user.id)
                    .maybeSingle();


            if (error) {

                console.error(
                    "IOIS admin check:",
                    error
                );

                return false;
            }


            return (
                data?.is_admin === true ||
                data?.role === "admin"
            );


        } catch (error) {

            console.error(error);

            return false;
        }
    }


    window.IOISAuth.isAdmin =
        isAdmin;


    /* =====================================================
       18. REQUIRE ADMIN
    ===================================================== */

    async function requireAdmin(
        redirect = "index.html"
    ) {

        const session =
            await getSession();


        if (!session) {

            window.location.href =
                "login.html";

            return false;
        }


        const admin =
            await isAdmin();


        if (!admin) {

            showMessage(
                "आपको Admin Panel की permission नहीं है।",
                "error"
            );

            setTimeout(() => {

                window.location.href =
                    redirect;

            }, 1000);

            return false;
        }


        return true;
    }


    window.IOISAuth.requireAdmin =
        requireAdmin;


    /* =====================================================
       19. MEMBERSHIP PLAN STORAGE
    ===================================================== */

    function saveSelectedPlan(
        plan,
        planCode = ""
    ) {

        try {

            localStorage.setItem(
                "iois_selected_plan",
                JSON.stringify({

                    plan:
                        safeText(plan),

                    planCode:
                        safeText(planCode),

                    selectedAt:
                        new Date().toISOString()
                })
            );

        } catch (error) {

            console.warn(
                "IOIS selected plan storage failed.",
                error
            );
        }
    }


    function getSelectedPlan() {

        try {

            const value =
                localStorage.getItem(
                    "iois_selected_plan"
                );

            return value
                ? JSON.parse(value)
                : null;

        } catch (_) {

            return null;
        }
    }


    window.IOISAuth.saveSelectedPlan =
        saveSelectedPlan;

    window.IOISAuth.getSelectedPlan =
        getSelectedPlan;


    /* =====================================================
       20. GLOBAL LOGIN MODAL SUPPORT
    ===================================================== */

    window.openLoginModal =
        function () {

            const modal =
                document.getElementById(
                    "login-modal"
                );

            if (modal) {

                modal.classList.remove(
                    "hidden"
                );

                return;
            }

            window.location.href =
                "login.html";
        };


    /* =====================================================
       21. REGISTRATION FLOW
    ===================================================== */

    window.openRegistrationFlow =
        function () {

            window.location.href =
                "register.html";
        };


    window.openRegistrationFlowWithTier =
        function (tier) {

            saveSelectedPlan(tier);

            window.location.href =
                "register.html";
        };


    /* =====================================================
       22. LOGOUT BUTTON SUPPORT
    ===================================================== */

    window.handleIOISLogout =
        function () {

            logoutUser(
                "login.html"
            );
        };


    /* =====================================================
       23. LOGIN FORM AUTO CONNECT
    ===================================================== */

    function setupLoginForm() {

        const form =
            document.getElementById(
                "login-form"
            );

        if (!form) {
            return;
        }


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const email =
                    document
                        .getElementById(
                            "login-email"
                        )
                        ?.value;


                const password =
                    document
                        .getElementById(
                            "login-password"
                        )
                        ?.value;


                const button =
                    form.querySelector(
                        "button[type='submit']"
                    );


                setButtonLoading(
                    button,
                    true
                );


                const result =
                    await loginUser(
                        email,
                        password
                    );


                setButtonLoading(
                    button,
                    false
                );


                if (
                    result.success
                ) {

                    setTimeout(
                        () => {

                            window.location.href =
                                getPostLoginRedirect();

                        },
                        600
                    );
                }

            }
        );
    }


    /* =====================================================
       24. FORGOT PASSWORD FORM
    ===================================================== */

    function setupForgotPasswordForm() {

        const form =
            document.getElementById(
                "forgot-password-form"
            );

        if (!form) {
            return;
        }


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const email =
                    document
                        .getElementById(
                            "forgot-email"
                        )
                        ?.value;


                const button =
                    form.querySelector(
                        "button[type='submit']"
                    );


                setButtonLoading(
                    button,
                    true
                );


                await forgotPassword(
                    email
                );


                setButtonLoading(
                    button,
                    false
                );
            }
        );
    }


    /* =====================================================
       26. REGISTRATION FORM AUTO CONNECT
    ===================================================== */

    function setupRegistrationForm() {

        const form =
            document.getElementById(
                "registration-form"
            ) ||
            document.getElementById(
                "reg-form"
            );

        if (!form) {
            return;
        }


        /*
         * अगर पुराने HTML में inline
         * onsubmit लगा है तो duplicate submit
         * रोकने के लिए केवल तभी listener लगाएंगे
         * जब form पहले से marked न हो।
         */

        if (
            form.dataset.ioisAuthBound === "true"
        ) {
            return;
        }


        form.dataset.ioisAuthBound =
            "true";


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const planElement =
                    document.getElementById(
                        "reg-card-tier"
                    ) ||
                    document.getElementById(
                        "membership-plan"
                    );


                const nameElement =
                    document.getElementById(
                        "reg-name"
                    );


                const emailElement =
                    document.getElementById(
                        "reg-email"
                    );


                const phoneElement =
                    document.getElementById(
                        "reg-phone"
                    );


                const passwordElement =
                    document.getElementById(
                        "reg-password"
                    );


                const addressElement =
                    document.getElementById(
                        "reg-address"
                    );


                const sponsorNameElement =
                    document.getElementById(
                        "reg-sponsor-name"
                    );


                const sponsorIdElement =
                    document.getElementById(
                        "reg-sponsor-id"
                    );


                const upiElement =
                    document.getElementById(
                        "reg-withdrawal-upi"
                    );


                const button =
                    form.querySelector(
                        "button[type='submit']"
                    );


                const selectedPlan =
                    planElement?.value ||
                    getSelectedPlan()?.plan ||
                    "";


                const result =
                    await registerUser({

                        fullName:
                            nameElement?.value,

                        email:
                            emailElement?.value,

                        phone:
                            phoneElement?.value,

                        password:
                            passwordElement?.value,

                        address:
                            addressElement?.value,

                        sponsorName:
                            sponsorNameElement?.value,

                        sponsorId:
                            sponsorIdElement?.value,

                        withdrawalUpi:
                            upiElement?.value,

                        plan:
                            selectedPlan,

                        planCode:
                            planElement
                                ?.dataset
                                ?.planCode || "",

                        paymentProof:
                            document
                                .getElementById(
                                    "payment-proof"
                                )
                                ?.value || "",

                        identityProof:
                            document
                                .getElementById(
                                    "identity-proof"
                                )
                                ?.value || ""
                    });


                if (
                    result.success
                ) {

                    setButtonLoading(
                        button,
                        true
                    );


                    setTimeout(
                        () => {

                            window.location.href =
                                "login.html";

                        },
                        1200
                    );
                }

            }
        );
    }


    /* =====================================================
       27. AUTH STATE LISTENER
    ===================================================== */

    function setupAuthListener() {

        const client =
            getClient();

        if (!client) {
            return;
        }


        client.auth.onAuthStateChange(
            (event, session) => {

                console.log(
                    "IOIS Auth Event:",
                    event
                );


                window.dispatchEvent(
                    new CustomEvent(
                        "iois-auth-state-change",
                        {
                            detail: {

                                event,

                                session
                            }
                        }
                    )
                );


                if (
                    event ===
                    "SIGNED_OUT"
                ) {

                    try {

                        localStorage.removeItem(
                            "iois_pending_registration"
                        );

                    } catch (_) {}

                }

            }
        );
    }


    /* =====================================================
       28. PAGE PROTECTION
    ===================================================== */

    async function applyPageProtection() {

        const page =
            getPageName();


        /*
         * Dashboard
         */

        if (
            page ===
            "dashboard.html"
        ) {

            await requireLogin();

            return;
        }


        /*
         * ID Card
         */

        if (
            page ===
            "idcard.html"
        ) {

            await requireLogin();

            return;
        }


        /*
         * Admin
         */

        if (
            page ===
            "admin.html"
        ) {

            await requireAdmin();

            return;
        }


        /*
         * Login page:
         * already logged-in user को dashboard
         */

        if (
            page ===
            "login.html"
        ) {

            const session =
                await getSession();

            if (session) {

                window.location.href =
                    "dashboard.html";
            }
        }
    }


    /* =====================================================
       29. UNIQUE USER ID DISPLAY
       -----------------------------------------------------
       यह value database से आती है।
       Frontend इसे edit नहीं कर सकता।
    ===================================================== */

    async function loadUniqueUserId(
        elementId = "unique-user-id"
    ) {

        const element =
            document.getElementById(
                elementId
            );

        if (!element) {
            return null;
        }


        const profile =
            await loadProfile();


        if (!profile) {
            return null;
        }


        const value =
            profile.unique_user_id ||
            profile.user_code ||
            profile.member_id ||
            "";


        element.textContent =
            value || "Generating...";


        return value;
    }


    window.IOISAuth.loadUniqueUserId =
        loadUniqueUserId;


    /* =====================================================
       30. DISABLE UNIQUE ID EDITING
    ===================================================== */

    function protectUniqueIdInputs() {

        const selectors = [

            "#unique-user-id",

            "#user-id",

            "#member-id",

            "[name='unique_user_id']",

            "[name='user_id']",

            "[data-immutable-user-id]"
        ];


        document
            .querySelectorAll(
                selectors.join(",")
            )
            .forEach(element => {

                element.readOnly =
                    true;

                element.disabled =
                    false;

                element.setAttribute(
                    "aria-readonly",
                    "true"
                );

                element.addEventListener(
                    "keydown",
                    event => {

                        event.preventDefault();
                    }
                );

            });
    }


    /* =====================================================
       31. COPY UNIQUE USER ID
    ===================================================== */

    window.copyIOISUserId =
        async function (
            elementId = "unique-user-id"
        ) {

            const element =
                document.getElementById(
                    elementId
                );

            if (!element) {
                return false;
            }


            const value =
                safeText(
                    element.textContent ||
                    element.value
                );


            if (!value) {
                return false;
            }


            try {

                await navigator.clipboard
                    .writeText(value);


                showMessage(
                    "Unique User ID copy हो गई। इसे सुरक्षित रखें।",
                    "success"
                );

                return true;


            } catch (error) {

                console.error(error);

                return false;
            }
        };


    /* =====================================================
       32. INITIALIZE
    ===================================================== */

    async function initializeIOISAuth() {

        IOISAuth.init();

        if (!IOISAuth.client) {
            return;
        }


        setupAuthListener();

        setupLoginForm();

        setupForgotPasswordForm();


        setupRegistrationForm();

        protectUniqueIdInputs();

        await applyPageProtection();


        /*
         * Dashboard / ID card पर
         * available हो तो ID load करें।
         */

        const page =
            getPageName();

        if (
            page === "dashboard.html" ||
            page === "idcard.html"
        ) {

            await loadUniqueUserId();
        }


        /*
         * Page custom event
         */

        window.dispatchEvent(
            new CustomEvent(
                "iois-auth-ready"
            )
        );
    }


    /* =====================================================
       33. DOM READY
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeIOISAuth
        );

    } else {

        initializeIOISAuth();
    }


    /* =====================================================
       34. EXPORT HELPERS
    ===================================================== */

    window.IOIS = window.IOIS || {};

    window.IOIS.auth =
        window.IOISAuth;

})();
