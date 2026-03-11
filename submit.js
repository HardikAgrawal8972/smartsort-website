/* ============================================
   SmartSort — E-Waste Submission Form Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // FIREBASE CONFIGURATION (MOCK WITH LOCALSTORAGE)
    // ==========================================
    // TODO: Replace localStorage with Firebase Firestore
    // 
    // 1. Install Firebase:  npm install firebase
    // 2. Initialize Firebase with your config:
    //
    //    import { initializeApp } from "firebase/app";
    //    import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
    //
    //    const firebaseConfig = {
    //      apiKey: "YOUR_API_KEY",
    //      authDomain: "YOUR_PROJECT.firebaseapp.com",
    //      projectId: "YOUR_PROJECT_ID",
    //      storageBucket: "YOUR_PROJECT.appspot.com",
    //      messagingSenderId: "YOUR_SENDER_ID",
    //      appId: "YOUR_APP_ID"
    //    };
    //
    //    const app = initializeApp(firebaseConfig);
    //    const db = getFirestore(app);
    //
    // 3. Replace saveSubmission() calls with:
    //    await addDoc(collection(db, "submissions"), submissionData);
    //
    // 4. Replace getSubmissions() calls with:
    //    const querySnapshot = await getDocs(collection(db, "submissions"));
    //    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // ==========================================

    const STORAGE_KEY = 'smartsort_submissions';

    function getSubmissions() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    function saveSubmission(entry) {
        const submissions = getSubmissions();
        submissions.push(entry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
    }

    function generateSubmissionId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let id = 'SS-';
        for (let i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    // ==========================================
    // IMPACT CALCULATION ENGINE
    // ==========================================

    // CO2 offset factors (kg CO2 per gram of device)
    const CO2_FACTORS = {
        'Mobile Phone': 0.070,
        'Laptop': 0.050,
        'Tablet': 0.055,
        'Battery': 0.030,
        'Charger/Cable': 0.020,
        'PCB / Circuit Board': 0.090,
        'Other': 0.035
    };

    // Reward points per gram
    const REWARD_FACTORS = {
        'Mobile Phone': 0.50,
        'Laptop': 0.40,
        'Tablet': 0.45,
        'Battery': 0.25,
        'Charger/Cable': 0.15,
        'PCB / Circuit Board': 0.60,
        'Other': 0.20
    };

    function calculateCO2(deviceType, weightGrams) {
        const factor = CO2_FACTORS[deviceType] || 0.035;
        const co2Kg = (weightGrams * factor) / 1000;
        return Math.max(0.01, parseFloat(co2Kg.toFixed(2)));
    }

    function calculateRewardPoints(deviceType, weightGrams, condition) {
        const factor = REWARD_FACTORS[deviceType] || 0.20;
        let points = weightGrams * factor;
        // Bonus for working devices
        if (condition === 'Working') points *= 1.5;
        else if (condition === 'Partially Working') points *= 1.2;
        return Math.round(points);
    }

    function determineBin(condition) {
        switch (condition) {
            case 'Working':
                return {
                    bin: 'Reuse',
                    icon: 'ph-arrows-clockwise',
                    color: 'var(--green)',
                    bg: 'var(--green-dim)',
                    desc: 'Device will be refurbished and redistributed to underserved communities.'
                };
            case 'Partially Working':
                return {
                    bin: 'Refurbish',
                    icon: 'ph-wrench',
                    color: '#eab308',
                    bg: 'rgba(234, 179, 8, 0.12)',
                    desc: 'Device will be repaired and restored to functional state.'
                };
            case 'Not Working':
            default:
                return {
                    bin: 'Recycle',
                    icon: 'ph-recycle',
                    color: 'var(--teal)',
                    bg: 'var(--teal-dim)',
                    desc: 'Materials like copper, gold, and lithium will be safely extracted.'
                };
        }
    }

    // ==========================================
    // FORM STATE MANAGEMENT
    // ==========================================
    let currentStep = 1;
    const totalSteps = 3;

    const form = document.getElementById('ewasteForm');
    const formContainer = document.getElementById('formContainer');
    const successState = document.getElementById('successState');
    const progressFill = document.getElementById('progressFill');
    const progressSteps = document.querySelectorAll('.progress-step');

    // Step navigation buttons
    const nextStep1 = document.getElementById('nextStep1');
    const nextStep2 = document.getElementById('nextStep2');
    const prevStep2 = document.getElementById('prevStep2');
    const prevStep3 = document.getElementById('prevStep3');

    function updateProgress() {
        const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressFill.style.width = percentage + '%';

        progressSteps.forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');
            if (stepNum === currentStep) step.classList.add('active');
            if (stepNum < currentStep) step.classList.add('completed');
        });
    }

    function showStep(step) {
        document.querySelectorAll('.form-step').forEach(s => {
            s.classList.remove('active', 'slide-left', 'slide-right');
        });

        const targetStep = document.getElementById('step' + step);
        if (targetStep) {
            targetStep.classList.add('active');
        }

        currentStep = step;
        updateProgress();

        // Scroll to top of form
        document.querySelector('.form-progress').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ==========================================
    // VALIDATION
    // ==========================================

    function validateField(fieldId, errorId, validationFn) {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(errorId);
        const value = field.value.trim();
        const result = validationFn(value);

        if (result.valid) {
            field.closest('.input-wrapper')?.classList.remove('error');
            field.closest('.input-wrapper')?.classList.add('valid');
            errorEl.textContent = '';
            return true;
        } else {
            field.closest('.input-wrapper')?.classList.remove('valid');
            field.closest('.input-wrapper')?.classList.add('error');
            errorEl.textContent = result.message;
            return false;
        }
    }

    function validateStep1() {
        let valid = true;

        valid = validateField('fullName', 'fullNameError', (v) => ({
            valid: v.length >= 2,
            message: v.length === 0 ? 'Full name is required' : 'Name must be at least 2 characters'
        })) && valid;

        valid = validateField('phone', 'phoneError', (v) => ({
            valid: /^[6-9]\d{9}$/.test(v),
            message: v.length === 0 ? 'Phone number is required' : 'Enter a valid 10-digit Indian phone number'
        })) && valid;

        valid = validateField('email', 'emailError', (v) => ({
            valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
            message: v.length === 0 ? 'Email address is required' : 'Enter a valid email address'
        })) && valid;

        valid = validateField('city', 'cityError', (v) => ({
            valid: v.length > 0,
            message: 'Please select a deployment area'
        })) && valid;

        return valid;
    }

    function validateStep2() {
        let valid = true;

        valid = validateField('deviceType', 'deviceTypeError', (v) => ({
            valid: v.length > 0,
            message: 'Please select a device type'
        })) && valid;

        valid = validateField('brand', 'brandError', (v) => ({
            valid: v.length >= 1,
            message: 'Brand is required'
        })) && valid;

        valid = validateField('weight', 'weightError', (v) => {
            const num = parseInt(v);
            return {
                valid: !isNaN(num) && num >= 1 && num <= 50000,
                message: v.length === 0 ? 'Weight is required' : 'Enter a valid weight between 1 and 50,000 grams'
            };
        }) && valid;

        // Validate condition radio
        const conditionSelected = document.querySelector('input[name="condition"]:checked');
        const conditionError = document.getElementById('conditionError');
        if (!conditionSelected) {
            conditionError.textContent = 'Please select the device condition';
            valid = false;
        } else {
            conditionError.textContent = '';
        }

        return valid;
    }

    // ==========================================
    // STEP NAVIGATION
    // ==========================================

    nextStep1.addEventListener('click', () => {
        if (validateStep1()) {
            showStep(2);
        }
    });

    nextStep2.addEventListener('click', () => {
        if (validateStep2()) {
            populateReview();
            showStep(3);
        }
    });

    prevStep2.addEventListener('click', () => showStep(1));
    prevStep3.addEventListener('click', () => showStep(2));

    // ==========================================
    // POPULATE REVIEW
    // ==========================================

    function populateReview() {
        const data = getFormData();

        document.getElementById('reviewName').textContent = data.fullName;
        document.getElementById('reviewPhone').textContent = data.phone;
        document.getElementById('reviewEmail').textContent = data.email;
        document.getElementById('reviewCity').textContent = data.city;
        document.getElementById('reviewDevice').textContent = data.deviceType;
        document.getElementById('reviewBrand').textContent = data.brand;
        document.getElementById('reviewWeight').textContent = data.weight + 'g';
        document.getElementById('reviewCondition').textContent = data.condition;

        // Calculate impacts
        const co2 = calculateCO2(data.deviceType, data.weight);
        const points = calculateRewardPoints(data.deviceType, data.weight, data.condition);
        const binInfo = determineBin(data.condition);

        document.getElementById('reviewCO2').textContent = co2 + ' kg';
        document.getElementById('reviewPoints').textContent = points + ' pts';

        // Bin assignment
        const binCard = document.getElementById('binCard');
        const binIcon = document.getElementById('binIcon');
        const binLabel = document.getElementById('binLabel');
        const binDesc = document.getElementById('binDesc');

        binIcon.innerHTML = `<i class="ph-fill ${binInfo.icon}"></i>`;
        binIcon.style.background = binInfo.bg;
        binIcon.style.color = binInfo.color;
        binLabel.textContent = binInfo.bin;
        binLabel.style.color = binInfo.color;
        binDesc.textContent = binInfo.desc;
    }

    function getFormData() {
        const conditionEl = document.querySelector('input[name="condition"]:checked');
        return {
            fullName: document.getElementById('fullName').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            email: document.getElementById('email').value.trim(),
            city: document.getElementById('city').value,
            deviceType: document.getElementById('deviceType').value,
            brand: document.getElementById('brand').value.trim(),
            weight: parseInt(document.getElementById('weight').value),
            condition: conditionEl ? conditionEl.value : ''
        };
    }

    // ==========================================
    // FORM SUBMISSION
    // ==========================================

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const submitBtnText = document.getElementById('submitBtnText');
        const submitSpinner = document.getElementById('submitSpinner');

        // Show loading state
        submitBtn.disabled = true;
        submitBtnText.textContent = 'Submitting...';
        submitSpinner.style.display = 'inline-block';

        const data = getFormData();
        const co2 = calculateCO2(data.deviceType, data.weight);
        const points = calculateRewardPoints(data.deviceType, data.weight, data.condition);
        const binInfo = determineBin(data.condition);
        const submissionId = generateSubmissionId();

        const submission = {
            id: submissionId,
            timestamp: new Date().toISOString(),
            fullName: data.fullName,
            phone: data.phone,
            email: data.email,
            city: data.city,
            deviceType: data.deviceType,
            brand: data.brand,
            weight: data.weight,
            condition: data.condition,
            binAssignment: binInfo.bin,
            co2Offset: co2,
            rewardPoints: points
        };

        // Simulate async submission (Firebase-style 1.5s delay)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Save to localStorage (swap with Firebase addDoc in production)
        saveSubmission(submission);

        // Show success state
        form.style.display = 'none';
        document.querySelector('.form-progress').style.display = 'none';
        successState.style.display = 'block';

        document.getElementById('successSubmissionId').textContent = submissionId;
        document.getElementById('successCO2').textContent = co2 + ' kg';
        document.getElementById('successPoints').textContent = points + ' pts';
        document.getElementById('successBin').textContent = binInfo.bin;

        // Scroll to top
        document.querySelector('.submit-header').scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Reset button state
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Submit E-Waste';
        submitSpinner.style.display = 'none';
    });

    // ==========================================
    // SUBMIT ANOTHER
    // ==========================================

    document.getElementById('submitAnother').addEventListener('click', () => {
        form.reset();
        form.style.display = 'block';
        document.querySelector('.form-progress').style.display = 'block';
        successState.style.display = 'none';

        // Clear all validation states
        document.querySelectorAll('.input-wrapper').forEach(w => {
            w.classList.remove('error', 'valid');
        });
        document.querySelectorAll('.form-error').forEach(e => {
            e.textContent = '';
        });
        document.querySelectorAll('.radio-card input').forEach(r => {
            r.checked = false;
        });

        // Reset upload
        const uploadPreview = document.getElementById('uploadPreview');
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        uploadPreview.style.display = 'none';
        uploadPlaceholder.style.display = 'flex';

        showStep(1);
    });

    // ==========================================
    // COPY SUBMISSION ID
    // ==========================================

    document.getElementById('copySubmissionId').addEventListener('click', () => {
        const id = document.getElementById('successSubmissionId').textContent;
        navigator.clipboard.writeText(id).then(() => {
            const btn = document.getElementById('copySubmissionId');
            btn.innerHTML = '<i class="ph-bold ph-check"></i>';
            btn.style.color = 'var(--green)';
            setTimeout(() => {
                btn.innerHTML = '<i class="ph-bold ph-copy"></i>';
                btn.style.color = '';
            }, 2000);
        });
    });

    // ==========================================
    // IMAGE UPLOAD HANDLER
    // ==========================================

    const uploadZone = document.getElementById('uploadZone');
    const devicePhoto = document.getElementById('devicePhoto');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewImage = document.getElementById('previewImage');
    const removePhoto = document.getElementById('removePhoto');

    uploadZone.addEventListener('click', (e) => {
        if (e.target.closest('.upload-remove')) return;
        devicePhoto.click();
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleImageUpload(files[0]);
        }
    });

    devicePhoto.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageUpload(e.target.files[0]);
        }
    });

    removePhoto.addEventListener('click', (e) => {
        e.stopPropagation();
        devicePhoto.value = '';
        uploadPreview.style.display = 'none';
        uploadPlaceholder.style.display = 'flex';
    });

    function handleImageUpload(file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('File is too large. Maximum size is 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            uploadPreview.style.display = 'flex';
            uploadPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    // ==========================================
    // REAL-TIME VALIDATION (on blur)
    // ==========================================

    document.getElementById('fullName').addEventListener('blur', () => {
        validateField('fullName', 'fullNameError', (v) => ({
            valid: v.length >= 2,
            message: v.length === 0 ? 'Full name is required' : 'Name must be at least 2 characters'
        }));
    });

    document.getElementById('phone').addEventListener('blur', () => {
        validateField('phone', 'phoneError', (v) => ({
            valid: /^[6-9]\d{9}$/.test(v),
            message: v.length === 0 ? 'Phone number is required' : 'Enter a valid 10-digit Indian phone number'
        }));
    });

    document.getElementById('email').addEventListener('blur', () => {
        validateField('email', 'emailError', (v) => ({
            valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
            message: v.length === 0 ? 'Email address is required' : 'Enter a valid email address'
        }));
    });

    // ==========================================
    // MOBILE NAV TOGGLE
    // ==========================================

    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('open');
            document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // Initialize
    updateProgress();

    console.log('🌿 SmartSort — E-Waste Submission Form loaded.');
});
