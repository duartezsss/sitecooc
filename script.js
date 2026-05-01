// UTMify Pixel Events Wrapper
function triggerPixelEvent(eventName) {
    console.log(`[Pixel] Firing event: ${eventName}`);
    if (window.fbq && eventName !== 'PageView') {
        window.fbq('track', eventName);
    }
}

// Preserve UTMs function
function preserveUTMs() {
    const params = new URLSearchParams(window.location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "fbclid"];
    keys.forEach(k => {
        const val = params.get(k);
        if (val) localStorage.setItem(k, val);
    });
}

function getStoredUTMs() {
    const utms = {};
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "fbclid"];
    keys.forEach(k => {
        const val = localStorage.getItem(k);
        if (val) utms[k] = val;
    });
    return utms;
}

// Lifecycle
document.addEventListener("DOMContentLoaded", () => {
    preserveUTMs();
    triggerPixelEvent("PageView");
});

// UI Actions
function scrollToOffers() {
    triggerPixelEvent("InitiateCheckout");
    document.getElementById("ofertas").scrollIntoView({ behavior: 'smooth' });
}

// Checkout State
let currentOffer = { id: '', name: '', price: 0 };
let currentBumps = { bump1: false, bump2: false };
const PRICES = { bump1: 29.90, bump2: 49.90 };
let currentHash = null;
let statusInterval = null;

// Currency Formatter
const formatMoney = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function calculateTotal() {
    let total = currentOffer.price;
    if (currentBumps.bump1) total += PRICES.bump1;
    if (currentBumps.bump2) total += PRICES.bump2;
    document.getElementById("final-total").innerText = formatMoney(total);
    return total;
}

function toggleBump(bumpNum) {
    const isChecked = document.getElementById(`bump-${bumpNum}`).checked;
    
    // Logical exclusion (if 1 is selected, 2 is unselected automatically, though not strictly required, standard practice)
    if (bumpNum === 1 && isChecked) {
        document.getElementById('bump-2').checked = false;
        currentBumps.bump2 = false;
        document.getElementById('label-bump-2').classList.remove('selected');
    } else if (bumpNum === 2 && isChecked) {
        document.getElementById('bump-1').checked = false;
        currentBumps.bump1 = false;
        document.getElementById('label-bump-1').classList.remove('selected');
    }

    currentBumps[`bump${bumpNum}`] = isChecked;
    document.getElementById(`label-bump-${bumpNum}`).classList.toggle('selected', isChecked);
    
    calculateTotal();
}

function startCheckout(offerId, price) {
    triggerPixelEvent("AddToCart");
    
    const titles = {
        '1x': '1 Travesseiro SonoFix',
        '2x': '2 Travesseiros SonoFix',
        '3x': '3 Travesseiros SonoFix',
        '4x': '4 Travesseiros SonoFix'
    };
    
    currentOffer = { id: offerId, title: titles[offerId], price: price };
    
    // Reset Bumps
    document.getElementById('bump-1').checked = false;
    document.getElementById('bump-2').checked = false;
    currentBumps = { bump1: false, bump2: false };
    document.getElementById('label-bump-1').classList.remove('selected');
    document.getElementById('label-bump-2').classList.remove('selected');
    
    // Update UI Summary
    document.getElementById("summary-title").innerText = currentOffer.title;
    document.getElementById("summary-price").innerText = formatMoney(currentOffer.price);
    calculateTotal();

    // Show Modal
    document.getElementById("landing-page").classList.add("hidden");
    document.getElementById("checkout-overlay").classList.remove("hidden");
    window.scrollTo(0, 0);
    
    // Go to step 1
    goToCheckoutStep(1);
}

function closeCheckout() {
    document.getElementById("checkout-overlay").classList.add("hidden");
    document.getElementById("landing-page").classList.remove("hidden");
}

function goToCheckoutStep(step) {
    document.getElementById("error-msg").classList.add("hidden");
    document.getElementById("error-msg").innerText = "";

    // Toggle steps
    document.getElementById("step-1").classList.add("hidden");
    document.getElementById("step-2").classList.add("hidden");
    document.getElementById("step-3").classList.add("hidden");
    
    document.getElementById(`step-${step}`).classList.remove("hidden");
    
    // Toggle indicators
    const ind1 = document.getElementById("step-indicator-1");
    const ind2 = document.getElementById("step-indicator-2");
    const ind3 = document.getElementById("step-indicator-3");
    
    ind1.className = step >= 1 ? "active" : "";
    ind2.className = step >= 2 ? "active" : "";
    ind3.className = step >= 3 ? "active" : "";

    window.scrollTo(0, 0);
}

function showError(msg) {
    const errorBox = document.getElementById("error-msg");
    errorBox.innerText = msg;
    errorBox.classList.remove("hidden");
}

function nextStep(step) {
    if (step === 2) {
        // Validate Step 1
        const nome = document.getElementById("nome").value;
        const email = document.getElementById("email").value;
        const tel = document.getElementById("telefone").value;
        const cpf = document.getElementById("cpf").value;
        
        if (!nome || !email || !tel || !cpf) {
            showError("Preencha todos os campos obrigatórios (Nome, E-mail, Telefone, CPF).");
            return;
        }
        triggerPixelEvent("InitiateCheckout");
        goToCheckoutStep(2);

    } else if (step === 3) {
        // Validate Step 2
        const cep = document.getElementById("cep").value;
        const rua = document.getElementById("rua").value;
        const num = document.getElementById("numero").value;
        const bai = document.getElementById("bairro").value;
        const cid = document.getElementById("cidade").value;
        const est = document.getElementById("estado").value;

        if (!cep || !rua || !num || !bai || !cid || !est) {
            showError("Preencha os campos obrigatórios do endereço.");
            return;
        }
        
        // Generate PIX
        goToCheckoutStep(3);
        generatePix();
    }
}

// ViaCEP
async function handleCepKeyup(e) {
    let cep = e.target.value.replace(/\D/g, "");
    if (cep.length === 8) {
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (!data.erro) {
                document.getElementById("rua").value = data.logradouro;
                document.getElementById("bairro").value = data.bairro;
                document.getElementById("cidade").value = data.localidade;
                document.getElementById("estado").value = data.uf;
                document.getElementById("numero").focus();
            } else {
                showError("CEP Inválido");
            }
        } catch(err) {
            console.error(err);
        }
    }
}

// Generate PIX API CALL
async function generatePix() {
    document.getElementById("pix-loading").classList.remove("hidden");
    document.getElementById("pix-content").classList.add("hidden");
    document.getElementById("pix-error").classList.add("hidden");
    document.getElementById("pix-paid").classList.add("hidden");
    
    document.getElementById("order-bumps").classList.add("hidden"); // disable bumps
    
    triggerPixelEvent("AddPaymentInfo");

    const btnGerar = document.getElementById("btn-gerar-pix");
    if(btnGerar) btnGerar.disabled = true;

    try {
        const payload = {
            customer: {
                name: document.getElementById("nome").value,
                email: document.getElementById("email").value,
                phone_number: document.getElementById("telefone").value.replace(/\D/g, ''),
                document: document.getElementById("cpf").value.replace(/\D/g, '')
            },
            utms: getStoredUTMs(),
            checkoutUrl: window.location.href,
            total: Math.round(calculateTotal() * 100), // kept for backwards compatibility just in case
            offer: currentOffer
        };

        console.log("PAYLOAD ENVIADO PARA API:", payload);

        const res = await fetch("/api/pix-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        console.log("RESPOSTA COMPLETA DA API PIX:", JSON.stringify(data));

        if ((data.success !== false) && data.pix) {
            document.getElementById("pix-loading").classList.add("hidden");
            document.getElementById("pix-content").classList.remove("hidden");
            
            if (data.pix.qr_code_base64) {
                document.getElementById("qr-code-img").src = `data:image/png;base64,${data.pix.qr_code_base64}`;
            } else if (data.pix.pix_qr_code_base64) {
                document.getElementById("qr-code-img").src = `data:image/png;base64,${data.pix.pix_qr_code_base64}`;
            }
            
            document.getElementById("pix-code").value = data.pix.pix_qr_code || data.pix.qr_code || "ERRO AO CARREGAR CÓDIGO";
            
            currentHash = data.hash || data.pix.hash;
            
            let minutesLeft = 5;
            if (data.pix.expiration_date) {
                const expDate = new Date(data.pix.expiration_date).getTime();
                const now = new Date().getTime();
                let diffMin = Math.round((expDate - now) / 60000);
                if (diffMin > 0) minutesLeft = diffMin;
            } else if (data.pix.expires_in) {
                minutesLeft = data.pix.expires_in;
            }
            
            startPixTimer(minutesLeft);
            pollPixStatus(currentHash);
        } else {
            console.error("ERRO REAL DA API PIX:", JSON.stringify(data));
            throw new Error(data.error || data.message || "Failed from Gateway");
        }
    } catch(err) {
        console.error("FALHA CATASTRÓFICA NO CHECKOUT:", err);
        document.getElementById("pix-loading").classList.add("hidden");
        document.getElementById("pix-error").classList.remove("hidden");
        if(btnGerar) btnGerar.disabled = false;
        document.getElementById("order-bumps").classList.remove("hidden");
    }
}

function copyPix() {
    const copyText = document.getElementById("pix-code");
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value);
    alert("Código Pix copiado!");
}

function startPixTimer(minutes) {
    let timeLeft = minutes * 60;
    const timerEl = document.getElementById("pix-timer");
    
    const count = setInterval(() => {
        if(document.getElementById("pix-content").classList.contains("hidden")) {
            clearInterval(count); // aborted or paid
            return;
        }

        timeLeft--;
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        timerEl.innerText = `Tempo restante: ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(count);
            timerEl.innerText = "Expirado";
            document.getElementById("pix-content").classList.add('hidden');
            document.getElementById("pix-error").classList.remove('hidden');
            document.getElementById("pix-error").innerHTML = '<h3>O código Pix expirou.</h3> <button class="btn btn-secondary w-100" onclick="nextStep(2)">Tentar Novamente</button>';
        }
    }, 1000);
}

function pollPixStatus(hash) {
    if (statusInterval) clearInterval(statusInterval);
    
    statusInterval = setInterval(async () => {
        try {
            const res = await fetch(`/api/pix-proxy?action=check_status&hash=${hash}`);
            const data = await res.json();
            if (data.status === 'paid') {
                clearInterval(statusInterval);
                triggerPixelEvent("Purchase");
                
                document.getElementById("pix-content").classList.add("hidden");
                document.getElementById("pix-paid").classList.remove("hidden");
            }
        } catch (e) {
            console.log("Status poll failed", e);
        }
    }, 5000);
}
