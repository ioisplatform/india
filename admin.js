/* =========================================================
   IOIS PLATFORM
   ADMIN PANEL
   admin.js
   =========================================================

   SECURITY NOTE:
   This frontend NEVER uses the Supabase service-role key.

   Real admin authorization must be enforced by:
   - Supabase RLS
   - admin role / admin_profiles table
   - secure database policies

   Frontend checks are only UI protection.
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
       ===================================================== */

    let adminUser = null;
    let adminProfile = null;

    let membersCache = [];
    let paymentsCache = [];
    let registrationsCache = [];

    let initialized = false;


    /* =====================================================
       DOM
       ===================================================== */

    function $(id) {
        return document.getElementById(id);
    }


    function setText(
        id,
        value
    ) {

        const element = $(id);

        if (element) {

            element.textContent =
                value === null ||
                value === undefined ||
                value === ""
                    ? "—"
                    : value;

        }

    }


    function notify(
        message,
        type = "info"
    ) {

        if (
            typeof window.showToast ===
            "function"
        ) {

            window.showToast(
                message,
                type
            );

            return;
        }


        if (type === "error") {
            alert("❌ " + message);
        }

        else if (type === "success") {
            alert("✅ " + message);
        }

        else {
            alert(message);
        }

    }


    /* =====================================================
       HTML ESCAPE
       ===================================================== */

    function escapeHTML(
        value
    ) {

        return String(
            value ?? ""
        )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

    }


    /* =====================================================
       AUTH
       ===================================================== */

    async function requireAdmin() {

        if (!window.ioisSupabase) {

            notify(
                "Supabase connection उपलब्ध नहीं है।",
                "error"
            );

            return false;
        }


        const {
            session,
            error
        } = await window.ioisGetSession();


        if (
            error ||
            !session ||
            !session.user
        ) {

            window.location.href =
                "login.html?redirect=admin.html";

            return false;
        }


        adminUser =
            session.user;


        return await verifyAdminRole();

    }


    /* =====================================================
       VERIFY ADMIN
       ===================================================== */

    async function verifyAdminRole() {

        try {

            /*
             * Preferred structure:
             *
             * admin_profiles
             * ----------------
             * user_id
             * role
             * active
             *
             * If your existing SQL uses another table,
             * change ONLY this query.
             */


            const {
                data,
                error
            } = await window.ioisSupabase
                .from("admin_profiles")
                .select("*")
                .eq(
                    "user_id",
                    adminUser.id
                )
                .maybeSingle();


            if (error) {

                console.error(
                    "Admin verification:",
                    error
                );

                notify(
                    "Admin authorization verify नहीं हो सका।",
                    "error"
                );

                window.location.href =
                    "dashboard.html";

                return false;
            }


            if (
                !data ||
                data.active === false ||
                (
                    data.role &&
                    ![
                        "admin",
                        "super_admin",
                        "owner"
                    ].includes(
                        String(
                            data.role
                        ).toLowerCase()
                    )
                )
            ) {

                notify(
                    "आपके account को Admin access नहीं मिला है।",
                    "error"
                );

                window.location.href =
                    "dashboard.html";

                return false;
            }


            adminProfile =
                data;


            setText(
                "admin-name",
                data.full_name ||
                data.name ||
                "IOIS Administrator"
            );


            return true;


        } catch (error) {

            console.error(
                error
            );

            window.location.href =
                "dashboard.html";

            return false;
        }

    }


    /* =====================================================
       LOAD MEMBERS
       ===================================================== */

    async function loadMembers() {

        try {

            const {
                data,
                error
            } = await window.ioisSupabase
                .from("profiles")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


            if (error) {
                throw error;
            }


            membersCache =
                Array.isArray(data)
                    ? data
                    : [];


            setText(
                "total-members",
                membersCache.length
            );


            renderMembers(
                membersCache
            );


        } catch (error) {

            console.error(
                "Members:",
                error
            );


            notify(
                "Members data load नहीं हो सका।",
                "error"
            );

        }

    }


    /* =====================================================
       RENDER MEMBERS
       ===================================================== */

    function renderMembers(
        members
    ) {

        const tbody =
            $("members-table-body");


        if (!tbody) {
            return;
        }


        tbody.innerHTML = "";


        if (!members.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7"
                        class="text-center py-8 text-gray-500">
                        कोई member record नहीं मिला।
                    </td>
                </tr>
            `;

            return;
        }


        members.forEach(
            member => {

                const row =
                    document.createElement("tr");


                const status =
                    member.status ||
                    "active";


                row.innerHTML = `

                    <td class="px-3 py-3">

                        <div class="font-bold">
                            ${
                                escapeHTML(
                                    member.full_name ||
                                    member.name ||
                                    "Member"
                                )
                            }
                        </div>

                        <div class="text-[10px] text-gray-500">
                            ${
                                escapeHTML(
                                    member.email ||
                                    ""
                                )
                            }
                        </div>

                    </td>


                    <td class="px-3 py-3">

                        ${
                            escapeHTML(
                                member.user_id ||
                                member.unique_user_id ||
                                "—"
                            )
                        }

                    </td>


                    <td class="px-3 py-3">

                        ${
                            escapeHTML(
                                member.whatsapp_number ||
                                member.phone ||
                                "—"
                            )
                        }

                    </td>


                    <td class="px-3 py-3">

                        ${
                            escapeHTML(
                                member.sponsor_id ||
                                "—"
                            )
                        }

                    </td>


                    <td class="px-3 py-3">

                        <span class="
                            px-2 py-1
                            rounded
                            text-[10px]
                            font-bold
                            ${
                                String(
                                    status
                                ).toLowerCase()
                                === "active"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }
                        ">

                            ${
                                escapeHTML(
                                    status
                                )
                            }

                        </span>

                    </td>


                    <td class="px-3 py-3">

                        ${
                            formatDate(
                                member.created_at
                            )
                        }

                    </td>


                    <td class="px-3 py-3">

                        <button
                            type="button"
                            onclick="IOISAdmin.viewMember('${member.id}')"
                            class="
                                px-3 py-1
                                rounded-lg
                                bg-amber-400
                                text-gray-950
                                text-[10px]
                                font-bold
                            ">
                            View
                        </button>

                    </td>

                `;


                tbody.appendChild(
                    row
                );

            }
        );

    }


    /* =====================================================
       LOAD PAYMENTS
       ===================================================== */

    async function loadPayments() {

        try {

            const {
                data,
                error
            } = await window.ioisSupabase
                .from("payments")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


            if (error) {
                throw error;
            }


            paymentsCache =
                Array.isArray(data)
                    ? data
                    : [];


            setText(
                "total-payments",
                paymentsCache.length
            );


            renderPayments(
                paymentsCache
            );


        } catch (error) {

            console.warn(
                "Payments table:",
                error
            );

        }

    }


    /* =====================================================
       RENDER PAYMENTS
       ===================================================== */

    function renderPayments(
        payments
    ) {

        const tbody =
            $("payments-table-body");


        if (!tbody) {
            return;
        }


        tbody.innerHTML = "";


        if (!payments.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7"
                        class="text-center py-8 text-gray-500">
                        कोई payment record नहीं मिला।
                    </td>
                </tr>
            `;

            return;
        }


        payments.forEach(
            payment => {

                const row =
                    document.createElement("tr");


                row.innerHTML = `

                    <td class="px-3 py-3">
                        ${
                            escapeHTML(
                                payment.payment_id ||
                                payment.transaction_id ||
                                "—"
                            )
                        }
                    </td>


                    <td class="px-3 py-3">
                        ₹${
                            Number(
                                payment.amount || 0
                            ).toFixed(2)
                        }
                    </td>


                    <td class="px-3 py-3">
                        ${
                            escapeHTML(
                                payment.plan_name ||
                                payment.plan ||
                                "—"
                            )
                        }
                    </td>


                    <td class="px-3 py-3">
                        ${
                            escapeHTML(
                                payment.payment_method ||
                                "UPI"
                            )
                        }
                    </td>


                    <td class="px-3 py-3">
                        ${
                            escapeHTML(
                                payment.status ||
                                "Pending"
                            )
                        }
                    </td>


                    <td class="px-3 py-3">
                        ${
                            formatDate(
                                payment.created_at
                            )
                        }
                    </td>


                    <td class="px-3 py-3">

                        <button
                            type="button"
                            onclick="IOISAdmin.viewPayment('${payment.id}')"
                            class="
                                px-3 py-1
                                bg-teal-400
                                text-gray-950
                                rounded-lg
                                text-[10px]
                                font-bold
                            ">
                            View
                        </button>

                    </td>

                `;


                tbody.appendChild(
                    row
                );

            }
        );

    }


    /* =====================================================
       LOAD REGISTRATIONS
       ===================================================== */

    async function loadRegistrations() {

        try {

            const {
                data,
                error
            } = await window.ioisSupabase
                .from("registrations")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


            if (error) {
                throw error;
            }


            registrationsCache =
                Array.isArray(data)
                    ? data
                    : [];


            setText(
                "pending-registrations",
                registrationsCache.filter(
                    item =>
                        String(
                            item.status || ""
                        ).toLowerCase()
                        === "pending"
                ).length
            );


            renderRegistrations(
                registrationsCache
            );


        } catch (error) {

            console.warn(
                "Registrations table:",
                error
            );

        }

    }


    /* =====================================================
       RENDER REGISTRATIONS
       ===================================================== */

    function renderRegistrations(
        registrations
    ) {

        const tbody =
            $("registrations-table-body");


        if (!tbody) {
            return;
        }


        tbody.innerHTML = "";


        if (!registrations.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7"
                        class="text-center py-8 text-gray-500">
                        कोई registration pending नहीं है।
                    </td>
                </tr>
            `;

            return;
        }


        registrations.forEach(
            registration => {

                const row =
                    document.createElement("tr");


                row.innerHTML = `

                    <td class="px-3 py-3">

                        ${
                            escapeHTML(
                                registration.full_name ||
                                registration.name ||
                                "—"
                            )
                        }

                    </td>


                    <td class="px-3 py-3">

                        ${
                            escapeHTML(
                                registration.email ||
                                "—"
                            )
                        }

                    </td>


                    <td class="px-3 py-3">

                        ${
                            escapeHTML(
                                registration.whatsapp_number ||
                                registration.phone ||
                                "—"
                            )
                        }

                    </td>


                    <td class="px-3 py-3">

                        ${
                            escapeHTML(
                                registration.plan_name ||
                                registration.plan ||
                                "—"
                            )
                        }

                    </td>


                    <td class="px-3 py-3">

                        ${
                            escapeHTML(
                                registration.status ||
                                "Pending"
                            )
                        }

                    </td>


                    <td class="px-3 py-3">

                        ${
                            formatDate(
                                registration.created_at
                            )
                        }

                    </td>


                    <td class="px-3 py-3">

                        <div class="flex gap-2">

                            <button
                                type="button"
                                onclick="IOISAdmin.approveRegistration('${registration.id}')"
                                class="
                                    px-2 py-1
                                    bg-green-500
                                    text-white
                                    rounded
                                    text-[10px]
                                    font-bold
                                ">
                                Approve
                            </button>


                            <button
                                type="button"
                                onclick="IOISAdmin.rejectRegistration('${registration.id}')"
                                class="
                                    px-2 py-1
                                    bg-red-500
                                    text-white
                                    rounded
                                    text-[10px]
                                    font-bold
                                ">
                                Reject
                            </button>

                        </div>

                    </td>

                `;


                tbody.appendChild(
                    row
                );

            }
        );

    }


    /* =====================================================
       APPROVE REGISTRATION
       ===================================================== */

    async function approveRegistration(
        registrationId
    ) {

        if (
            !confirm(
                "क्या इस registration को approve करना है?"
            )
        ) {

            return;
        }


        try {

            const {
                error
            } = await window.ioisSupabase
                .from("registrations")
                .update({

                    status:
                        "approved",

                    reviewed_by:
                        adminUser.id,

                    reviewed_at:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    registrationId
                );


            if (error) {
                throw error;
            }


            notify(
                "Registration approved.",
                "success"
            );


            await loadRegistrations();


        } catch (error) {

            console.error(
                error
            );


            notify(
                error.message ||
                "Approval failed.",
                "error"
            );

        }

    }


    /* =====================================================
       REJECT REGISTRATION
       ===================================================== */

    async function rejectRegistration(
        registrationId
    ) {

        const reason =
            prompt(
                "Reject करने का कारण लिखें:"
            );


        if (reason === null) {
            return;
        }


        try {

            const {
                error
            } = await window.ioisSupabase
                .from("registrations")
                .update({

                    status:
                        "rejected",

                    rejection_reason:
                        reason,

                    reviewed_by:
                        adminUser.id,

                    reviewed_at:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    registrationId
                );


            if (error) {
                throw error;
            }


            notify(
                "Registration rejected.",
                "success"
            );


            await loadRegistrations();


        } catch (error) {

            console.error(
                error
            );


            notify(
                error.message ||
                "Rejection failed.",
                "error"
            );

        }

    }


    /* =====================================================
       VIEW MEMBER
       ===================================================== */

    function viewMember(
        memberId
    ) {

        const member =
            membersCache.find(
                item =>
                    item.id === memberId
            );


        if (!member) {

            notify(
                "Member नहीं मिला।",
                "error"
            );

            return;
        }


        const details = `

नाम: ${
    member.full_name ||
    member.name ||
    "—"
}

Email: ${
    member.email ||
    "—"
}

WhatsApp: ${
    member.whatsapp_number ||
    member.phone ||
    "—"
}

Unique User ID: ${
    member.user_id ||
    member.unique_user_id ||
    "—"
}

Sponsor ID: ${
    member.sponsor_id ||
    "—"
}

Status: ${
    member.status ||
    "—"
}

Registered:
${
    formatDate(
        member.created_at
    )
}

        `.trim();


        alert(details);

    }


    /* =====================================================
       VIEW PAYMENT
       ===================================================== */

    function viewPayment(
        paymentId
    ) {

        const payment =
            paymentsCache.find(
                item =>
                    item.id === paymentId
            );


        if (!payment) {

            notify(
                "Payment record नहीं मिला।",
                "error"
            );

            return;
        }


        const details = `

Payment ID:
${
    payment.payment_id ||
    payment.transaction_id ||
    "—"
}

Amount:
₹${
    Number(
        payment.amount || 0
    ).toFixed(2)
}

Plan:
${
    payment.plan_name ||
    payment.plan ||
    "—"
}

Method:
${
    payment.payment_method ||
    "UPI"
}

Status:
${
    payment.status ||
    "Pending"
}

Date:
${
    formatDate(
        payment.created_at
    )
}

        `.trim();


        alert(details);

    }


    /* =====================================================
       SEARCH MEMBERS
       ===================================================== */

    function searchMembers(
        keyword
    ) {

        const value =
            String(
                keyword || ""
            )
            .trim()
            .toLowerCase();


        if (!value) {

            renderMembers(
                membersCache
            );

            return;

        }


        const filtered =
            membersCache.filter(
                member => {

                    const text =
                        [
                            member.full_name,
                            member.name,
                            member.email,
                            member.whatsapp_number,
                            member.phone,
                            member.user_id,
                            member.unique_user_id,
                            member.sponsor_id,
                            member.sponsor_name
                        ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return text.includes(
                        value
                    );

                }
            );


        renderMembers(
            filtered
        );

    }


    /* =====================================================
       REFRESH ALL
       ===================================================== */

    async function refreshAdminData() {

        await Promise.all([
            loadMembers(),
            loadPayments(),
            loadRegistrations()
        ]);

    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function logout() {

        const result =
            await window.ioisLogout();


        if (!result.success) {

            notify(
                result.error?.message ||
                "Logout failed.",
                "error"
            );

            return;
        }


        window.location.href =
            "login.html";

    }


    /* =====================================================
       DATE
       ===================================================== */

    function formatDate(
        value
    ) {

        if (!value) {
            return "—";
        }


        try {

            return new Date(
                value
            ).toLocaleString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

        } catch {

            return value;

        }

    }


    /* =====================================================
       INIT
       ===================================================== */

    async function initAdmin() {

        if (initialized) {
            return;
        }


        initialized = true;


        const authorized =
            await requireAdmin();


        if (!authorized) {
            return;
        }


        await refreshAdminData();


        if (
            window.ioisSupabase &&
            window.ioisSupabase.auth
        ) {

            window.ioisSupabase.auth
                .onAuthStateChange(
                    (
                        event,
                        session
                    ) => {

                        if (
                            event ===
                            "SIGNED_OUT"
                        ) {

                            window.location.href =
                                "login.html";

                        }

                        if (
                            event ===
                            "SIGNED_IN"
                        ) {

                            adminUser =
                                session?.user ||
                                null;

                        }

                    }
                );

        }

    }


    /* =====================================================
       GLOBAL ADMIN API
       ===================================================== */

    window.IOISAdmin = {

        init:
            initAdmin,

        refresh:
            refreshAdminData,

        loadMembers:
            loadMembers,

        loadPayments:
            loadPayments,

        loadRegistrations:
            loadRegistrations,

        searchMembers:
            searchMembers,

        approveRegistration:
            approveRegistration,

        rejectRegistration:
            rejectRegistration,

        viewMember:
            viewMember,

        viewPayment:
            viewPayment,

        logout:
            logout

    };


    /* =====================================================
       AUTO START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initAdmin
        );

    }

    else {

        initAdmin();

    }

})();
