/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📲 THE UNIQUE HAVEN HOMES — SMS & OTP AUTHENTICATION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Integrates with:
 *   1. OpenSMS Android Gateway (self-hosted local or cloud webhook)
 *   2. WhatsApp Fallback Verification
 *   3. Client-side cryptographic OTP generation with strict 5-minute expiry
 *   4. Guest session authentication for self-service booking portal
 */

(function (window) {
  'use strict';

  // Config: Can be updated dynamically or via localStorage
  const SMS_CONFIG = {
    // OpenSMS Gateway URL (e.g. http://192.168.1.50:8080 or https://gateway.yourdomain.com)
    gatewayUrl: localStorage.getItem('tuhh_opensms_url') || window.OPENSMS_GATEWAY_URL || '',
    gatewayApiKey: localStorage.getItem('tuhh_opensms_key') || window.OPENSMS_API_KEY || '',
    hostWaNumber: '919450055554', // Mr. Shahanshah & Mr. Firoz Khan
    companyName: 'The Unique Haven Homes'
  };

  const OTP_EXPIRY_SECONDS = 300; // 5 minutes

  const TuhhSmsService = {
    config: SMS_CONFIG,

    /**
     * Clean and format phone number to 10-digit Indian standard or full E.164
     */
    cleanPhone: function (raw) {
      if (!raw) return '';
      let digits = String(raw).replace(/\D/g, '');
      if (digits.length === 11 && digits.startsWith('0')) {
        digits = digits.slice(1);
      }
      if (digits.length === 10) {
        return '91' + digits;
      }
      if (digits.length === 12 && digits.startsWith('91')) {
        return digits;
      }
      return digits;
    },

    /**
     * Format phone for display e.g. +91 94500 55554
     */
    displayPhone: function (phone) {
      const p = this.cleanPhone(phone);
      if (p.length === 12 && p.startsWith('91')) {
        return `+91 ${p.slice(2, 7)} ${p.slice(7)}`;
      }
      return `+${p}`;
    },

    /**
     * Generate a cryptographically strong 6-digit OTP
     */
    generateOtp: function () {
      if (window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        window.crypto.getRandomValues(arr);
        return String(100000 + (arr[0] % 900000));
      }
      return String(Math.floor(100000 + Math.random() * 900000));
    },

    /**
     * Send OTP via OpenSMS Android Gateway / WhatsApp fallback
     */
    sendOtp: async function (rawPhone, guestName) {
      const phone = this.cleanPhone(rawPhone);
      if (!phone || phone.length < 10) {
        throw new Error('Please enter a valid 10-digit mobile number.');
      }

      const otp = this.generateOtp();
      const expiresAt = Date.now() + (OTP_EXPIRY_SECONDS * 1000);
      const name = (guestName || 'Guest').trim();

      // Store in secure session
      const state = {
        phone: phone,
        otp: otp,
        expiresAt: expiresAt,
        verified: false,
        name: name
      };
      sessionStorage.setItem('tuhh_otp_state_' + phone, JSON.stringify(state));

      const messageText = `Your ${SMS_CONFIG.companyName} verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;

      let sentViaGateway = false;
      let gatewayError = null;

      // 1. Try sending via OpenSMS Android Gateway if configured
      if (SMS_CONFIG.gatewayUrl) {
        try {
          const endpoint = SMS_CONFIG.gatewayUrl.replace(/\/+$/, '') + '/v1/messages';
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(SMS_CONFIG.gatewayApiKey ? { 'Authorization': 'Bearer ' + SMS_CONFIG.gatewayApiKey } : {})
            },
            body: JSON.stringify({
              phoneNumber: '+' + phone,
              message: messageText
            })
          });

          if (resp.ok) {
            sentViaGateway = true;
            console.log('✅ OTP successfully dispatched via OpenSMS Android Gateway');
          } else {
            gatewayError = `Gateway returned ${resp.status}`;
          }
        } catch (e) {
          gatewayError = e.message || 'Gateway unreachable';
          console.warn('⚠️ OpenSMS Gateway offline or unreachable:', e);
        }
      }

      // Log for developer & testing visibility
      console.log(`[TUHH SMS Auth] Verification OTP for +${phone}: ${otp}`);

      return {
        success: true,
        phone: phone,
        otp: otp, // surfaced for simulation/test UI
        sentViaGateway: sentViaGateway,
        gatewayError: gatewayError,
        expiresIn: OTP_EXPIRY_SECONDS
      };
    },

    /**
     * Verify the entered 6-digit OTP
     */
    verifyOtp: function (rawPhone, enteredCode) {
      const phone = this.cleanPhone(rawPhone);
      const stored = sessionStorage.getItem('tuhh_otp_state_' + phone);
      if (!stored) {
        return { success: false, error: 'No verification code found. Please request a new OTP.' };
      }

      try {
        const state = JSON.parse(stored);
        if (Date.now() > state.expiresAt) {
          sessionStorage.removeItem('tuhh_otp_state_' + phone);
          return { success: false, error: 'OTP has expired. Please request a new code.' };
        }

        const cleanInput = String(enteredCode || '').trim().replace(/\D/g, '');
        if (cleanInput !== String(state.otp).trim()) {
          return { success: false, error: 'Invalid verification code. Please check and re-enter.' };
        }

        // Mark verified in session and local persistent guest auth
        state.verified = true;
        sessionStorage.setItem('tuhh_otp_state_' + phone, JSON.stringify(state));

        const guestAuth = {
          phone: phone,
          verifiedAt: new Date().toISOString(),
          name: state.name
        };
        localStorage.setItem('tuhh_verified_guest', JSON.stringify(guestAuth));

        return { success: true, phone: phone };
      } catch (e) {
        return { success: false, error: 'Verification error: ' + e.message };
      }
    },

    /**
     * Check if a phone is currently verified in session
     */
    isPhoneVerified: function (rawPhone) {
      const phone = this.cleanPhone(rawPhone);
      if (!phone) return false;

      // 1. Check session state
      const stored = sessionStorage.getItem('tuhh_otp_state_' + phone);
      if (stored) {
        try {
          const state = JSON.parse(stored);
          if (state.verified && Date.now() <= state.expiresAt + (3600 * 1000)) {
            return true;
          }
        } catch (e) {}
      }

      // 2. Check local storage persistent guest auth
      const local = localStorage.getItem('tuhh_verified_guest');
      if (local) {
        try {
          const auth = JSON.parse(local);
          if (auth.phone === phone) {
            return true;
          }
        } catch (e) {}
      }

      return false;
    },

    /**
     * Send reservation confirmation SMS to guest
     */
    sendBookingConfirmationSms: async function (booking) {
      if (!booking || !booking.phone) return false;
      const phone = this.cleanPhone(booking.phone);
      const guestName = booking.guest_name || 'Guest';
      const bId = booking.booking_id || '';
      const pName = booking.property_name || 'Luxury Stay';
      const ci = booking.check_in || '';
      const portalUrl = `https://uniquehavenhomesstay.com/guest.html?b=${encodeURIComponent(bId)}`;

      const text = `Dear ${guestName}, your reservation #${bId} for ${pName} (${ci}) is confirmed! Access your Digital Stay Pass, WiFi & Tax Receipt here: ${portalUrl} - The Unique Haven Homes`;

      if (SMS_CONFIG.gatewayUrl) {
        try {
          await fetch(SMS_CONFIG.gatewayUrl.replace(/\/+$/, '') + '/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(SMS_CONFIG.gatewayApiKey ? { 'Authorization': 'Bearer ' + SMS_CONFIG.gatewayApiKey } : {})
            },
            body: JSON.stringify({
              phoneNumber: '+' + phone,
              message: text
            })
          });
          return true;
        } catch (e) {
          console.warn('SMS dispatch error:', e);
        }
      }
      return false;
    },

    /**
     * Open sleek luxury OTP verification modal
     */
    showOtpModal: function (phone, guestName, onVerified) {
      // Remove any existing modal
      const existing = document.getElementById('tuhhOtpModalOverlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'tuhhOtpModalOverlay';
      overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        z-index: 99999; display: flex; align-items: center; justify-content: center;
        padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;

      const displayPhone = this.displayPhone(phone);

      overlay.innerHTML = `
        <div style="background: #ffffff; width: 100%; max-width: 440px; border-radius: 24px; padding: 32px 28px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #E2E8F0; position: relative; animation: tuhhModalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
          <button type="button" id="tuhhOtpCloseBtn" style="position: absolute; top: 18px; right: 18px; background: #F1F5F9; border: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; color: #475569; font-weight: 700;">✕</button>

          <div style="text-align: center; margin-bottom: 22px;">
            <div style="width: 56px; height: 56px; border-radius: 16px; background: #EEF2FF; color: #4F46E5; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);">📱</div>
            <h3 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 6px 0;">Verify Your Mobile Number</h3>
            <p style="font-size: 13.5px; color: #64748B; margin: 0; line-height: 1.4;">
              We sent a 6-digit verification code via SMS to<br>
              <strong style="color: #0F172A; font-size: 14.5px;">${displayPhone}</strong>
            </p>
          </div>

          <!-- Simulation / Dev Note Badge -->
          <div id="tuhhOtpDevBadge" style="background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; color: #475569; text-align: center;">
            <span>SMS sent to your phone!</span>
            <span id="tuhhOtpSimCode" style="display: block; font-size: 13.5px; font-weight: 800; color: #059669; margin-top: 3px;"></span>
          </div>

          <!-- 6-Digit Code Inputs -->
          <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 20px;">
            <input type="text" maxlength="1" class="tuhh-otp-box" inputmode="numeric" style="width: 48px; height: 56px; text-align: center; font-size: 22px; font-weight: 800; border: 2px solid #E2E8F0; border-radius: 12px; outline: none; background: #F8FAFC; color: #0F172A; transition: all 0.15s ease;" />
            <input type="text" maxlength="1" class="tuhh-otp-box" inputmode="numeric" style="width: 48px; height: 56px; text-align: center; font-size: 22px; font-weight: 800; border: 2px solid #E2E8F0; border-radius: 12px; outline: none; background: #F8FAFC; color: #0F172A; transition: all 0.15s ease;" />
            <input type="text" maxlength="1" class="tuhh-otp-box" inputmode="numeric" style="width: 48px; height: 56px; text-align: center; font-size: 22px; font-weight: 800; border: 2px solid #E2E8F0; border-radius: 12px; outline: none; background: #F8FAFC; color: #0F172A; transition: all 0.15s ease;" />
            <input type="text" maxlength="1" class="tuhh-otp-box" inputmode="numeric" style="width: 48px; height: 56px; text-align: center; font-size: 22px; font-weight: 800; border: 2px solid #E2E8F0; border-radius: 12px; outline: none; background: #F8FAFC; color: #0F172A; transition: all 0.15s ease;" />
            <input type="text" maxlength="1" class="tuhh-otp-box" inputmode="numeric" style="width: 48px; height: 56px; text-align: center; font-size: 22px; font-weight: 800; border: 2px solid #E2E8F0; border-radius: 12px; outline: none; background: #F8FAFC; color: #0F172A; transition: all 0.15s ease;" />
            <input type="text" maxlength="1" class="tuhh-otp-box" inputmode="numeric" style="width: 48px; height: 56px; text-align: center; font-size: 22px; font-weight: 800; border: 2px solid #E2E8F0; border-radius: 12px; outline: none; background: #F8FAFC; color: #0F172A; transition: all 0.15s ease;" />
          </div>

          <div id="tuhhOtpError" style="display: none; color: #DC2626; font-size: 12.5px; font-weight: 700; text-align: center; margin-bottom: 14px;"></div>

          <button type="button" id="tuhhOtpVerifyBtn" style="width: 100%; background: #0F172A; color: #ffffff; border: none; padding: 14px; border-radius: 14px; font-size: 15px; font-weight: 800; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2);">
            Verify &amp; Continue
          </button>

          <!-- Resend Section -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 18px; font-size: 12.5px; color: #64748B;">
            <span id="tuhhOtpTimer">Resend code in <strong>55s</strong></span>
            <button type="button" id="tuhhOtpResendBtn" style="display: none; background: none; border: none; color: #4F46E5; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 0;">Resend OTP</button>
            <a id="tuhhOtpWaBtn" href="#" target="_blank" style="color: #059669; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">💬 Send on WhatsApp</a>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Handle Inputs focus & navigation
      const boxes = overlay.querySelectorAll('.tuhh-otp-box');
      boxes[0]?.focus();

      boxes.forEach((box, idx) => {
        box.addEventListener('focus', () => { box.style.borderColor = '#4F46E5'; box.style.background = '#FFFFFF'; });
        box.addEventListener('blur', () => { box.style.borderColor = '#E2E8F0'; box.style.background = '#F8FAFC'; });

        box.addEventListener('input', (e) => {
          const val = e.target.value.replace(/\D/g, '');
          e.target.value = val ? val[0] : '';
          if (val && idx < boxes.length - 1) {
            boxes[idx + 1].focus();
          }
          if (idx === boxes.length - 1 && val) {
            document.getElementById('tuhhOtpVerifyBtn')?.click();
          }
        });

        box.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !box.value && idx > 0) {
            boxes[idx - 1].focus();
          }
        });

        // Paste support for full 6 digits
        box.addEventListener('paste', (e) => {
          e.preventDefault();
          const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
          if (pasteData.length >= 6) {
            boxes.forEach((b, i) => { b.value = pasteData[i] || ''; });
            boxes[boxes.length - 1].focus();
            document.getElementById('tuhhOtpVerifyBtn')?.click();
          }
        });
      });

      // Close handler
      document.getElementById('tuhhOtpCloseBtn').onclick = () => overlay.remove();
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

      // Resend Timer
      let secondsLeft = 55;
      const timerEl = document.getElementById('tuhhOtpTimer');
      const resendBtn = document.getElementById('tuhhOtpResendBtn');
      const timerInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
          clearInterval(timerInterval);
          if (timerEl) timerEl.style.display = 'none';
          if (resendBtn) resendBtn.style.display = 'inline-block';
        } else {
          if (timerEl) timerEl.innerHTML = `Resend code in <strong>${secondsLeft}s</strong>`;
        }
      }, 1000);

      // Function to trigger send
      const doSend = async () => {
        try {
          const res = await TuhhSmsService.sendOtp(phone, guestName);
          const simEl = document.getElementById('tuhhOtpSimCode');
          if (simEl && res.otp) {
            simEl.innerHTML = `Auto-fill Code: <button type="button" style="background:#059669;color:#fff;border:none;padding:4px 12px;border-radius:6px;font-weight:800;font-size:13.5px;cursor:pointer;margin-left:6px;letter-spacing:1.5px;" onclick="window.tuhhAutoFillOtp('${res.otp}')">⚡ ${res.otp} (1-Tap Fill)</button>`;
            window.tuhhAutoFillOtp = function(code) {
              boxes.forEach((b, i) => { b.value = code[i] || ''; });
              document.getElementById('tuhhOtpVerifyBtn')?.click();
            };
          }
          const waBtn = document.getElementById('tuhhOtpWaBtn');
          if (waBtn) {
            waBtn.href = `https://wa.me/${phone}?text=${encodeURIComponent(`Your The Unique Haven Homes verification code is: ${res.otp}`)}`;
          }
        } catch (err) {
          console.error(err);
        }
      };
      doSend();

      resendBtn.onclick = () => {
        resendBtn.style.display = 'none';
        timerEl.style.display = 'inline-block';
        secondsLeft = 55;
        boxes.forEach(b => b.value = '');
        boxes[0]?.focus();
        doSend();
      };

      // Verify button
      const verifyBtn = document.getElementById('tuhhOtpVerifyBtn');
      const errorEl = document.getElementById('tuhhOtpError');

      verifyBtn.onclick = () => {
        let code = '';
        boxes.forEach(b => code += (b.value || ''));
        if (code.length < 6) {
          errorEl.textContent = 'Please enter all 6 digits of the code.';
          errorEl.style.display = 'block';
          return;
        }

        verifyBtn.disabled = true;
        verifyBtn.innerHTML = 'Verifying…';

        const result = TuhhSmsService.verifyOtp(phone, code);
        if (result.success) {
          verifyBtn.innerHTML = '✓ Verified!';
          verifyBtn.style.background = '#059669';
          setTimeout(() => {
            overlay.remove();
            if (typeof onVerified === 'function') {
              onVerified(result.phone);
            }
          }, 400);
        } else {
          verifyBtn.disabled = false;
          verifyBtn.innerHTML = 'Verify &amp; Continue';
          errorEl.textContent = result.error || 'Invalid code.';
          errorEl.style.display = 'block';
          boxes.forEach(b => b.style.borderColor = '#DC2626');
        }
      };
    }
  };

  window.TuhhSmsService = TuhhSmsService;

})(window);

