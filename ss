<!-- Lockscreen Settings Modal -->
    <div id="lockscreenModal" class="modal">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Lockscreen Wallpaper Settings</h3>
                <span class="modal-close lockscreen-modal-close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Screen Size</label>
                    <select id="lockscreenSize" style="width: 100%;">
                        <option value="1080,2400" selected>Galaxy A07/A56/A36/A17 (1080 x 2400)</option>
                        <option value="720,1600">Galaxy A05/A06 (720 x 1600)</option>
                        <option value="1440,3120">Galaxy S26/S25/S24 Ultra (1440 x 3120)</option>
                        <option value="1080,2340">Galaxy S26/S25/S24 Standard & Plus (1080 x 2340)</option>
                        <option value="1320,2868">iPhone 16 Pro Max (1320 x 2868)</option>
                        <option value="1206,2622">iPhone 16 Pro (1206 x 2622)</option>
                        <option value="1290,2796">iPhone 15/14 Pro Max (1290 x 2796)</option>
                        <option value="1179,2556">iPhone 16/15/14 Pro (1179 x 2556)</option>
                        <option value="1170,2532">iPhone 14/13/13 Pro (1170 x 2532)</option>
                        <option value="1220,2712">Redmi Note 14 Pro+/13 Pro 5G (1220 x 2712)</option>
                        <option value="1080,2400">Redmi Note 13/12 Standard (1080 x 2400)</option>
                        <option value="720,1650">Redmi 14C/13C Budget Tier (720 x 1650)</option>
                        <option value="1264,2780">Realme GT 6/6T (1264 x 2780)</option>
                        <option value="1080,2412">Realme 13 Pro+/12 Pro+ (1080 x 2412)</option>
                        <option value="720,1600">Realme C65/C63/C53 Note (720 x 1600)</option>
                        <option value="1260,2800">Vivo V40/V30 Pro 5G (1260 x 2800)</option>
                        <option value="1080,2400">Vivo Y100/Y28/Y17s (1080 x 2400)</option>
                        <option value="1080,2460">Infinix GT 20 Pro/Note 40 Pro (1080 x 2460)</option>
                        <option value="1080,2436">Tecno Pova 6 Pro/Camon 30 (1080 x 2436)</option>
                        <option value="720,1612">Infinix Smart 8/Tecno Spark 20 (720 x 1612)</option>
                        <option value="1240,2772">Oppo Reno 12 Pro/11 Pro (1240 x 2772)</option>
                        <option value="1080,2412">Oppo A3 Pro/A78/A98 (1080 x 2412)</option>
                        <option value="custom">Custom size...</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Color Theme</label>
                    <select id="lockscreenTheme" style="width: 100%;">
                        <option value="default" selected>Default (Cream & Blue)</option>
                        <option value="ustp">USTP-inspired</option>
                        <option value="dark">Dark Mode</option>
                        <option value="midnight">Midnight</option>
                        <option value="darkAcad">Dark Academia</option>
                        <option value="matcha1">Matcha 1 (Performative Male)</option>
                        <option value="matcha2">Matcha 2 (Estitik)</option>
                        <option value="minimal">Minimal (Personal fav lol)</option>
                        <option value="pastelGreen">Pastel Green</option>
                        <option value="pastelPink">Pastel Pink</option>
                        <option value="pastelBlue">Pastel Blue</option>
                        <option value="custom">Custom Colors</option>
                    </select>
                    <div class="form-group" style="padding-top: 8px; border-top: 1px solid #e8ecf1;">
                        <button id="previewThemeBtn" style="padding: 8px 14px; background: #2f2a60; color: white; border: none; border-radius: 40px; cursor: pointer; font-weight: 500; font-size: 0.7rem; font-family: inherit; transition: all 0.2s ease; white-space: nowrap;">
                        👁 Preview
                    </button>
                    </div>
                </div>

                <!-- Custom Colors Container -->
                <div id="customColorsContainer" style="display: none; padding: 12px; background: #f8fafc; border-radius: 12px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
                    <p style="font-size: 0.75rem; font-weight: 600; color: #334155; margin-bottom: 12px;">🖌 Customize Your Colors</p>
                    <div class="form-row" style="grid-template-columns: 1fr 1fr;">
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label style="font-size: 0.65rem;">Background</label>
                            <input type="color" id="customBg" value="#faf7f0" style="width: 100%; height: 40px; padding: 2px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
                        </div>
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label style="font-size: 0.65rem;">Card</label>
                            <input type="color" id="customCard" value="#e8f0fe" style="width: 100%; height: 40px; padding: 2px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
                        </div>
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label style="font-size: 0.65rem;">Title</label>
                            <input type="color" id="customTitle" value="#2c3e4e" style="width: 100%; height: 40px; padding: 2px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
                        </div>
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label style="font-size: 0.65rem;">Day Name</label>
                            <input type="color" id="customDayName" value="#2c3e4e" style="width: 100%; height: 40px; padding: 2px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
                        </div>
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label style="font-size: 0.65rem;">Text</label>
                            <input type="color" id="customText" value="#1a2a3a" style="width: 100%; height: 40px; padding: 2px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
                        </div>
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label style="font-size: 0.65rem;">Time</label>
                            <input type="color" id="customTime" value="#6b8a9e" style="width: 100%; height: 40px; padding: 2px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.65rem;">Room</label>
                            <input type="color" id="customRoom" value="#5a7a8e" style="width: 100%; height: 40px; padding: 2px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
                        </div>
                    </div>
                    <div >
                        <button id="previewBtn" style="margin-top: 12px; padding: 8px 20px; background: #2f2a60; color: white; border: none; border-radius: 40px; cursor: pointer; font-weight: 600; font-size: 0.75rem; font-family: inherit; width: 100%; transition: all 0.2s ease;">
                            👁 Preview Custom Colors
                        </button>
                    </div>
                    <button id="closePreviewBtn" style="display: none; margin-top: 8px; padding: 6px 16px; background: #ef4444; color: white; border: none; border-radius: 40px; cursor: pointer; font-weight: 500; font-size: 0.7rem; font-family: inherit; transition: all 0.2s ease;">
                        ✕ Close Preview
                    </button>
                </div>

                <div id="lockscreenCustomContainer" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Width</label>
                            <input type="number" id="lockscreenCustomWidth" placeholder="1080" value="1080">
                        </div>
                        <div class="form-group">
                            <label>Height</label>
                            <input type="number" id="lockscreenCustomHeight" placeholder="1920" value="1920">
                        </div>
                    </div>
                </div>

                <div class="form-group" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e8ecf1;">
                    <label>Padding <span id="paddingValue">5</span>%</label>
                    <input type="range" id="paddingSlider" min="0" max="20" value="5" style="width: 100%;">
                </div>
                <p style="font-size: 0.7rem; color: #64748b; margin-top: 12px;">
                    The image will be centered with your chosen padding. Adjust if content gets cut off on your phone.
                </p>
            </div>
            <div class="modal-footer">
                <button type="button" class="modal-btn cancel-btn" id="cancelLockscreenBtn">Cancel</button>
                <button type="button" class="modal-btn save-btn" id="generateLockscreenBtn">Generate & Save</button>
            </div>
        </div>
    </div>