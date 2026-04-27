/**
 * Postoperative Hypokalemia Prediction - Frontend Application
 * Handles form submission, API calls, and result visualization
 */

// ========================================
// Configuration
// ========================================
const CONFIG = {
    // Update this URL to your Render backend when deployed
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8000'  // Local development
        : 'https://hypokalemia-backend.onrender.com',  // Production (Render)
    
    ENDPOINTS: {
        PREDICT: '/predict',
        HEALTH: '/health',
        INFO: '/info'
    },
    
    RISK_THRESHOLD: 0.5,
    ANIMATION_DURATION: 700
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    form: document.getElementById('predictionForm'),
    predictBtn: document.getElementById('predictBtn'),
    resetBtn: document.getElementById('resetBtn'),
    resultCard: document.getElementById('resultCard'),
    riskCircle: document.getElementById('riskCircle'),
    probabilityValue: document.getElementById('probabilityValue'),
    probabilityBar: document.getElementById('probabilityBar'),
    riskLabel: document.getElementById('riskLabel'),
    riskBadge: document.getElementById('riskBadge'),
    interpretationText: document.getElementById('interpretationText'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    errorToast: document.getElementById('errorToast'),
    errorMessage: document.getElementById('errorMessage')
};

// ========================================
// Utility Functions
// ========================================

/**
 * Show error toast notification
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorToast.classList.add('show');
    setTimeout(() => {
        elements.errorToast.classList.remove('show');
    }, 5000);
}

/**
 * Toggle loading state
 */
function setLoading(isLoading) {
    if (isLoading) {
        elements.loadingOverlay.classList.remove('hidden');
        elements.predictBtn.disabled = true;
        elements.predictBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
    } else {
        elements.loadingOverlay.classList.add('hidden');
        elements.predictBtn.disabled = false;
        elements.predictBtn.innerHTML = '<i class="fas fa-calculator mr-2"></i><span>Calculate Risk</span>';
    }
}

/**
 * Validate input values
 */
function validateInputs(data) {
    const { preop_fasting_h, preop_potassium, preop_renin } = data;
    
    if (preop_fasting_h < 0 || preop_fasting_h > 72) {
        throw new Error('Fasting duration should be between 0-72 hours');
    }
    if (preop_potassium < 1 || preop_potassium > 8) {
        throw new Error('Serum potassium should be between 1-8 mmol/L');
    }
    if (preop_renin < 0 || preop_renin > 200) {
        throw new Error('Renin level should be between 0-200 uIU/mL');
    }
    return true;
}

// ========================================
// API Functions
// ========================================

/**
 * Call prediction API
 */
async function predictHypokalemia(formData) {
    const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.PREDICT}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

/**
 * Check API health status
 */
async function checkHealth() {
    try {
        const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.HEALTH}`;
        const response = await fetch(url);
        
        if (response.ok) {
            console.log('✅ Backend API is healthy');
            return true;
        }
        return false;
    } catch (error) {
        console.warn('⚠️ Backend health check failed:', error.message);
        return false;
    }
}

// ========================================
// Result Visualization
// ========================================

/**
 * Display prediction results with animation
 */
function displayResult(result) {
    // 🔧 R Plumber 兼容：从单元素数组中提取标量值
    const _get = (v) => Array.isArray(v) ? v[0] : v;

    const success = _get(result.success);
    if (!success) {
        throw new Error(_get(result.error) || 'Prediction failed');
    }

    // 调试日志：打印完整 API 响应
    console.log('📊 API Response:', result);
    console.log('📊 Extracted - probability:', _get(result.probability), 'risk_level:', _get(result.risk_level));

    const probRaw = _get(result.probability);
    const riskLevel = String(_get(result.risk_level)).trim();

    // 🔧 双重判断：优先用 riskLevel 字符串匹配，若不一致则按概率覆盖
    let isHighRisk = (riskLevel === 'High Risk');
    const probPercent = Math.round(probRaw * 100);
    if (!isHighRisk && probRaw >= CONFIG.RISK_THRESHOLD) {
        console.warn(`⚠️ 风险等级不一致: riskLevel="${riskLevel}" 但 prob=${probPercent}%，强制修正为 High Risk`);
        isHighRisk = true;
    }
    if (isHighRisk && probRaw < CONFIG.RISK_THRESHOLD) {
        console.warn(`⚠️ 风险等级不一致: riskLevel="${riskLevel}" 但 prob=${probPercent}%，强制修正为 Low Risk`);
        isHighRisk = false;
    }
    
    // Show result card
    elements.resultCard.classList.add('show');
    
    // Update probability value
    elements.probabilityValue.textContent = `${probPercent}%`;
    
    // Update circle styling
    elements.riskCircle.classList.remove('high-risk', 'low-risk');
    elements.riskCircle.classList.add(isHighRisk ? 'high-risk' : 'low-risk');
    
    // Update risk badge
    elements.riskBadge.classList.remove('high-risk', 'low-risk', 'pending');
    elements.riskBadge.classList.add(isHighRisk ? 'high-risk' : 'low-risk');
    
    if (isHighRisk) {
        elements.riskBadge.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> High Risk';
        elements.interpretationText.innerHTML = `
            <strong class="text-red-600">High risk of postoperative hypokalemia detected.</strong>
            <br><br>
            The patient has a <strong>${probPercent}%</strong> probability of developing postoperative hypokalemia.
            Consider closer monitoring of serum potassium levels and potential prophylactic measures.
        `;
    } else {
        elements.riskBadge.innerHTML = '<i class="fas fa-shield-alt mr-1"></i> Low Risk';
        elements.interpretationText.innerHTML = `
            <strong class="text-green-600">Low risk of postoperative hypokalemia.</strong>
            <br><br>
            The patient has a <strong>${probPercent}%</strong> probability of developing postoperative hypokalemia.
            Standard postoperative monitoring protocols may be followed.
        `;
    }
    
    // Animate probability bar
    setTimeout(() => {
        elements.probabilityBar.style.width = `${probRaw * 100}%`;
    }, 100);
    
    // Scroll to result on mobile
    if (window.innerWidth < 1024) {
        elements.resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ========================================
// Event Handlers
// ========================================

/**
 * Handle form submission
 */
async function handleSubmit(event) {
    event.preventDefault();
    
    // Collect form data
    const formData = {
        preop_fasting_h: parseFloat(document.getElementById('preop_fasting_h').value),
        preop_potassium: parseFloat(document.getElementById('preop_potassium').value),
        preop_potassium_related_med: parseInt(document.getElementById('preop_potassium_related_med').value),
        preop_renin: parseFloat(document.getElementById('preop_renin').value)
    };
    
    try {
        // Validate inputs
        validateInputs(formData);
        
        // Set loading state
        setLoading(true);
        
        // Call API
        const result = await predictHypokalemia(formData);
        
        // Display results
        displayResult(result);
        
    } catch (error) {
        console.error('Prediction error:', error);
        showError(error.message || 'Failed to get prediction. Please try again.');
    } finally {
        setLoading(false);
    }
}

/**
 * Handle form reset
 */
function handleReset() {
    elements.form.reset();
    elements.resultCard.classList.remove('show');
    elements.probabilityBar.style.width = '0%';
    elements.probabilityValue.textContent = '--%';
    elements.riskBadge.className = 'inline-flex mt-3 px-4 py-1.5 rounded-full text-sm font-bold pending';
    elements.riskBadge.textContent = 'Pending Input';
    elements.riskCircle.classList.remove('high-risk', 'low-risk');
    elements.interpretationText.textContent = 'Enter patient data and click "Calculate Risk" to get the prediction result.';
}

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Bind event listeners
    elements.form.addEventListener('submit', handleSubmit);
    elements.resetBtn.addEventListener('click', handleReset);
    
    // Check backend health on load
    checkHealth().then(isHealthy => {
        if (!isHealthy) {
            console.info('ℹ️ Backend not available. Using local mode or check your connection.');
        }
    });
    
    // Add input animations for better UX
    const inputs = elements.form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        input.addEventListener('blur', () => {
            input.parentElement.classList.remove('focused');
        });
    });
    
    console.log('🏥 Hypokalemia Prediction System initialized');
    console.log(`📡 API endpoint: ${CONFIG.API_BASE_URL}`);
});
