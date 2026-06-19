// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let originalCourses = [];
let currentCourses = [];
let currentStudent = {};
let currentEditingCourse = null;
let currentEditingMeetingIndex = null;


const LOCKSREEN_THEMES = {
    default: {
        name: 'Default',
        background: '#faf7f0',
        card: '#e8f0fe',
        title: '#2c3e4e',
        dayName: '#2c3e4e',
        text: '#1a2a3a',
        time: '#6b8a9e',
        room: '#5a7a8e',
        border: 'rgba(44, 62, 78, 0.1)'
    },
    ustp: {
        name: 'USTP-inspired',
        background: '#1f1a4f',
        card: '#2a2470',
        title: '#f2af11',
        dayName: '#f2af11',
        text: '#f7f7f7',
        time: '#f2af11',
        room: '#f7f7f7',
        border: 'rgba(242, 175, 17, 0.2)'
    },
    dark: {
        name: 'Dark Mode',
        background: '#0f0f1a',
        card: '#1a2a3a',
        title: '#e2e8f0',
        dayName: '#94a3b8',
        text: '#e2e8f0',
        time: '#94a3b8',
        room: '#8a9aa8',
        border: 'rgba(255, 255, 255, 0.1)'
    },
    midnight: {
        name: 'Midnight',
        background: '#0d0d2b',
        card: '#1a1a4a',
        title: '#b8b8f0',
        dayName: '#8888c8',
        text: '#c8c8f0',
        time: '#8888c8',
        room: '#7878b8',
        border: 'rgba(150, 150, 255, 0.1)'
    },
    darkAcad: {
        name: 'Dark Academia',
        background: '#2a1a1a',
        card: '#4a2a1a',
        title: '#f5cba7',
        dayName: '#e8a87c',
        text: '#f5d5b8',
        time: '#e8a87c',
        room: '#d4886a',
        border: 'rgba(255, 200, 150, 0.15)'
    },
    matcha1: {
        name: 'Matcha 1 (Performative Male)',
        background: '#1a2e1a',
        card: '#2a4a2a',
        title: '#b8d9b8',
        dayName: '#8ab88a',
        text: '#d4e8d4',
        time: '#8ab88a',
        room: '#6a9a6a',
        border: 'rgba(255, 255, 255, 0.08)'
    },
    matcha2: {
        name: 'Matcha 2 (Estitik)',
        background: '#ddbea9',
        card: '#6b705c',
        title: '#6b705c',
        dayName: '#ddbea9',
        text: '#ddbea9',
        time: '#b7b7a4',
        room: '#ddbea9',
        border: 'rgba(255, 100, 100, 0.15)'
    },
    minimal: {
        name: 'Minimal (Personal fav lol)',
        background: '#ffffff',
        card: '#f5f5f5',
        title: '#333333',
        dayName: '#666666',
        text: '#333333',
        time: '#666666',
        room: '#555555',
        border: 'rgba(0, 0, 0, 0.08)'
    },
    pastelGreen: {
        name: 'Pastel Green',
        background: '#fff9e0',
        card: '#d9ebd3',
        title: '#4a6a5a',
        dayName: '#7a9a8a',
        text: '#4a5a52',
        time: '#8aaa9a',
        room: '#a3c4bd',
        border: 'rgba(120, 150, 130, 0.15)'
    },
    pastelPink: {
        name: 'Pastel Pink',
        background: '#fdf0f5',
        card: '#f5e0e8',
        title: '#6b4a5a',
        dayName: '#8a6a7a',
        text: '#5a4a52',
        time: '#8a6a7a',
        room: '#7a5a6a',
        border: 'rgba(100, 70, 80, 0.1)'
    },
    pastelBlue: {
        name: 'Pastel Blue',
        background: '#f0f8ff',
        card: '#dfeef8',
        title: '#4a5f6b',
        dayName: '#6a8191',
        text: '#4a555f',
        time: '#6a8191',
        room: '#5a7282',
        border: 'rgba(70, 90, 110, 0.1)'
    }
};


document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const resetBtn = document.getElementById('resetBtn');
    document.getElementById('exportICSBtn').addEventListener('click', exportICS);
    const lockscreenBtn = document.getElementById('lockscreenBtn');
    
    // Lockscreen modal handlers
    const lockscreenModal = document.getElementById('lockscreenModal');
    const cancelLockscreenBtn = document.getElementById('cancelLockscreenBtn');
    const generateLockscreenBtn = document.getElementById('generateLockscreenBtn');
    const lockscreenCloseBtn = document.querySelector('.lockscreen-modal-close');

    if (cancelLockscreenBtn) cancelLockscreenBtn.onclick = closeLockscreenModal;
    if (generateLockscreenBtn) generateLockscreenBtn.onclick = generateLockscreenImage;
    if (lockscreenCloseBtn) lockscreenCloseBtn.onclick = closeLockscreenModal;

    // Toggle custom size inputs in lockscreen modal
    const lockscreenSizeSelect = document.getElementById('lockscreenSize');
    const lockscreenCustomContainer = document.getElementById('lockscreenCustomContainer');
    if (lockscreenSizeSelect) {
        lockscreenSizeSelect.addEventListener('change', () => {
            lockscreenCustomContainer.style.display = lockscreenSizeSelect.value === 'custom' ? 'block' : 'none';
        });
    }

    // Padding slider
    const paddingSlider = document.getElementById('paddingSlider');
    const paddingValue = document.getElementById('paddingValue');
    if (paddingSlider) {
        paddingSlider.addEventListener('input', () => {
            paddingValue.textContent = paddingSlider.value;
        });
    }
    
    // File upload and buttons
    fileInput.addEventListener('change', handleFileUpload);
    resetBtn.addEventListener('click', resetToOriginal);
    document.getElementById('addCourseBtn').addEventListener('click', openAddModal);
    document.getElementById('saveAddBtn').addEventListener('click', addCourse);
    document.querySelector('.add-modal-close')?.addEventListener('click', closeAddModal);
    document.getElementById('cancelAddBtn')?.addEventListener('click', closeAddModal);
    document.getElementById('deleteBtn')?.addEventListener('click', deleteCurrentMeeting);
    if (lockscreenBtn) lockscreenBtn.addEventListener('click', generateLockscreen);
    
    // Edit Modal close handlers
    const editModal = document.getElementById('editModal');
    const editCloseBtn = document.querySelector('#editModal .modal-close');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveBtn');
    
    if (editCloseBtn) editCloseBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;
    if (saveBtn) saveBtn.onclick = saveCourseEdits;

    // Delete confirmation modal handlers
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
    const deleteCancelBtn = document.getElementById('deleteCancelBtn');
    const deleteConfirmClose = document.querySelector('.delete-confirm-close');

    if (deleteConfirmBtn) deleteConfirmBtn.onclick = confirmDelete;
    if (deleteCancelBtn) deleteCancelBtn.onclick = closeDeleteModal;
    if (deleteConfirmClose) deleteConfirmClose.onclick = closeDeleteModal;
    
    // Real-time validation for Add Modal
    const addCodeInput = document.getElementById('addCode');
    if (addCodeInput) {
        addCodeInput.addEventListener('input', validateAddModal);
    }

    // Real-time validation for Edit Modal
    const editCodeInput = document.getElementById('editCode');
    if (editCodeInput) {
        editCodeInput.addEventListener('input', validateEditModal);
    }
    
    // ========== SINGLE WINDOW.ONCLICK HANDLER ==========
    window.onclick = function(event) {
        // Close lockscreen modal
        if (event.target === lockscreenModal) {
            closeLockscreenModal();
        }
        // Close edit modal
        if (event.target === editModal) {
            closeModal();
        }
        // Close delete confirmation modal
        if (event.target === deleteConfirmModal) {
            closeDeleteModal();
        }
        // Close add modal
        const addModal = document.getElementById('addModal');
        if (event.target === addModal) {
            closeAddModal();
        }
    };
    
    showDemoGrid();
});


function showDemoGrid() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const times = [];
    for (let hour = 5; hour <= 23; hour++) {
        const period = hour >= 12 ? 'PM' : 'AM';
        let displayHour = hour % 12;
        if (displayHour === 0) displayHour = 12;
        times.push(`${displayHour}:00 ${period}`);
    }
    
    let html = '<div class="timetable-wrapper">';
    html += '<table class="timetable" id="timetableTable">';  // Add id here too
    html += '<thead><tr><th class="time-col">Time</th>';
    days.forEach(day => { html += `<th>${day}</th>`; });
    html += '</thead><tbody>';
    
    times.forEach(time => {
        html += `<tr class="time-row" style="height: 70px;">`;
        html += `<td class="time-slot"><strong>${time}</strong></td>`;
        days.forEach(() => {
            html += `<td class="empty-cell" style="height: 70px;"></td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody>`;
    html += `</table>`; 
    html += `</div>`;
    
    html += `<div style="margin-top: 20px; padding: 12px; background: #fffbeb; border-radius: 12px; color: #92400e; font-size: 0.75rem; text-align: center; border: 1px solid #fde68a;">
                <strong>Demo Mode:</strong> Upload your COR PDF (IT or CE) to see your actual schedule.
             </div>`;
    
    document.getElementById('timetableGrid').innerHTML = html;
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    showLoading(true);
    document.getElementById('timetableContainer').style.display = 'block';
    clearStatus();
    
    try {
        const courses = await parseCOR(file);
        
        if (courses.length === 0) {
            showStatus('No courses found. The PDF format might be different.', 'error');
            showDemoGrid();
            return;
        }
        
        originalCourses = JSON.parse(JSON.stringify(courses));
        currentCourses = JSON.parse(JSON.stringify(courses));
        
        renderTimetableGrid();
        
    } catch (error) {
        console.error('Parse error:', error);
        showStatus('Error parsing PDF.', 'error');
        showDemoGrid();
    } finally {
        showLoading(false);
    }
}

async function parseCOR(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    currentStudent = {};
    const courses = [];
    
    // Read ALL pages
    let allItems = [];
    let fullText = "";
    
    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        allItems.push(...textContent.items);
        fullText += textContent.items.map(i => i.str).join(" ") + "\n";
    }
    
    // Extract Student Info
    const nameMatch = fullText.match(/Name:\s*(.+?)\s+Student No:/i);
    if (nameMatch) currentStudent.name = nameMatch[1].trim();
    
    const studentMatch = fullText.match(/Student No:\s*(\d+)/i);
    if (studentMatch) currentStudent.studentNo = studentMatch[1];
    
    const programMatch = fullText.match(/Program:\s*(.+?)\s+(?:Major|Year Level|Gender)/i);
    if (programMatch) currentStudent.program = programMatch[1].trim();
    
    console.log("Student:", currentStudent);
    
    // Group by Y coordinate (rows)
    const rowMap = {};
    allItems.forEach(item => {
        const y = Math.round(item.transform[5]);
        let key = Object.keys(rowMap).find(k => Math.abs(Number(k) - y) <= 2);
        if (!key) {
            key = y;
            rowMap[key] = [];
        }
        rowMap[key].push(item);
    });
    
    const rows = Object.values(rowMap);
    rows.forEach(row => row.sort((a, b) => a.transform[4] - b.transform[4]));
    rows.sort((a, b) => b[0].transform[5] - a[0].transform[5]);
    
    // Parse rows
    let currentCourse = null;
    
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const texts = row.map(r => r.str.trim()).filter(Boolean);
        if (texts.length === 0) continue;
        
        const first = texts[0];
        
        // Expanded course code detection 
        const isCourseCode = (
            /^[A-Za-z]{2,6}\d{2,4}$/i.test(first.replace(/\s/g, "")) ||
            /^(PurCom|RPH|TCW|MMW|Ethc|Rizal|STS|UTS|ArtApp|GnS|PICPE|EnviSci|PATH\s*FIT\s*\d+|NSTP\d{3}|ES211a|FreeElec)$/i.test(first)
        );
        
        if (isCourseCode) {
            // Save previous course
            if (currentCourse && currentCourse.meetings.length > 0) {
                courses.push(currentCourse);
            }
            
            // Clean up the code
            let cleanCode = first.replace(/\s/g, "");
            if (cleanCode.match(/^PATHFIT/i)) cleanCode = "PATHFIT";
            
            currentCourse = {
                code: cleanCode,
                subject: "",
                faculty: "",
                meetings: []
            };
            
            // Extract subject - stop at section codes
            let subjectParts = [];
            for (let i = 1; i < texts.length; i++) {
                const text = texts[i];
                
                if (/^[A-Z]{3,10}_[A-Z]{2,4}_\d+[A-Z]?$/i.test(text)) break;
                if (/(AM|PM)/i.test(text)) break;
                if (text.match(/^(Mr\.|Ms\.|Mrs\.|Dr\.|MA\.|Ma\.|Prof\.)/i)) break;
                if (/^\d+$/.test(text) && text.length <= 2) break;
                
                if (text.length > 1) {
                    subjectParts.push(text);
                }
            }
            currentCourse.subject = subjectParts.join(" ").trim();
            
            // ========== IMPROVED FACULTY EXTRACTION ==========
            let facultyFound = false;

            // First, find where the schedule/room ends (look for text containing AM/PM)
            let scheduleEndIndex = -1;
            for (let i = 0; i < texts.length; i++) {
                if (/(AM|PM)/i.test(texts[i])) {
                    scheduleEndIndex = i;
                    break;
                }
            }

            // Only look for faculty AFTER the schedule/room
            if (scheduleEndIndex !== -1) {
                // Check current row for faculty (starting from scheduleEndIndex + 1)
                for (let i = scheduleEndIndex + 1; i < texts.length; i++) {
                    const text = texts[i];
                    
                    // Skip if contains numbers
                    if (/\d/.test(text)) continue;
                    
                    // Check for faculty titles
                    if (text.match(/^(Mr\.|Ms\.|Mrs\.|Dr\.|MA\.|Ma\.|Prof\.|Engr\.)/i)) {
                        currentCourse.faculty = texts.slice(i).join(" ").trim();
                        facultyFound = true;
                        break;
                    }
                    
                    // Check for ALL CAPS names (must be 2-4 words, no numbers)
                    if (text.match(/^[A-Z][A-Z\s.-]+$/) && text.length > 7 && text.length < 40) {
                        const words = text.split(/\s+/);
                        if (words.length >= 2 && words.length <= 4) {
                            currentCourse.faculty = text;
                            facultyFound = true;
                            break;
                        }
                    }
                    
                    // Check for Proper Case names (e.g., Christy Jugan)
                    if (text.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+/) && text.length < 40) {
                        currentCourse.faculty = text;
                        facultyFound = true;
                        break;
                    }
                }
            }

            // If not found in current row, check next row
            if (!facultyFound && rows[rowIndex + 1]) {
                const nextTexts = rows[rowIndex + 1].map(r => r.str.trim()).filter(Boolean);
                
                for (let i = 0; i < nextTexts.length; i++) {
                    const text = nextTexts[i];
                    
                    if (/\d/.test(text)) continue;
                    
                    if (text.match(/^(Mr\.|Ms\.|Mrs\.|Dr\.|MA\.|Ma\.|Prof\.|Engr\.)/i)) {
                        currentCourse.faculty = text;
                        facultyFound = true;
                        break;
                    }
                    
                    if (text.match(/^[A-Z][A-Z\s.]+$/) && text.length > 7 && text.length < 40) {
                        const words = text.split(/\s+/);
                        if (words.length >= 2 && words.length <= 4) {
                            currentCourse.faculty = text;
                            facultyFound = true;
                            break;
                        }
                    }
                    
                    if (text.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:-?[A-Z][a-z]+)?/) && text.length < 40) {
                        currentCourse.faculty = text;
                        facultyFound = true;
                        break;
                    }
                }
            }
            
            // Extract schedule patterns
            const rowText = texts.join(" ");
            extractSchedulesFromText(rowText, currentCourse);
        }
        
        // Check additional schedules in following rows for current course
        if (currentCourse) {
            const rowText = texts.join(" ");
            extractSchedulesFromText(rowText, currentCourse);
        }
    }
    
    // Save last course
    if (currentCourse && currentCourse.meetings.length > 0) {
        courses.push(currentCourse);
    }
    
    console.log("Parsed courses:", courses.map(c => ({
        code: c.code,
        subject: c.subject,
        faculty: c.faculty,
        meetings: c.meetings.length
    })));
    
    return courses;
}

// Helper function to extract schedules from text
function extractSchedulesFromText(text, course) {
    const schedulePattern = /(M|T|W|Th|F|S|TF|MTh|MW|MWF|TTh)\s+(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/gi;
    let scheduleMatch;
    
    while ((scheduleMatch = schedulePattern.exec(text)) !== null) {
        let day = scheduleMatch[1];
        let startTime = scheduleMatch[2];
        let endTime = scheduleMatch[3];
        
        // Get the text after the time pattern
        const afterTime = text.substring(scheduleMatch.index + scheduleMatch[0].length);
        
        // Extract room - improved to capture full room name including parentheses
        let room = "";

        // Try to extract room - look for room number pattern with optional parentheses content
        // Pattern: room number (like 09-302) optionally followed by (CITC Lab 3) or similar
        const fullRoomMatch = afterTime.match(/\b(\d{2,3}-\d{3,4})\s*(?:\(([^)]+)\))?/i);
        if (fullRoomMatch) {
            room = fullRoomMatch[1];
            if (fullRoomMatch[2]) {
                room = room + '(' + fullRoomMatch[2] + ')';
            }
        }

        // If no room number found, try "Modular Classroom"
        if (!room) {
            const modularMatch = afterTime.match(/(Modular\s*Classroom\s*\d+)/i);
            if (modularMatch) {
                room = modularMatch[1];
            }
        }

        // If still no room, try "Lab"
        if (!room) {
            const labMatch = afterTime.match(/([A-Za-z]+\s*Lab\s*\d+)/i);
            if (labMatch) {
                room = labMatch[1];
            }
        }

        // If still no room, try simple room number without parentheses
        if (!room) {
            const simpleRoom = afterTime.match(/\b(\d{2,3}-\d{3,4})\b/);
            if (simpleRoom) {
                room = simpleRoom[1];
            }
        }

        // Clean up room - remove any leftover faculty-like text
        if (room) {
            // Remove faculty names that might be attached
            room = room.replace(/\s+(Mr\.|Ms\.|Mrs\.|Dr\.|MA\.|Ma\.|Prof\.|Engr\.|GEON|SEDINIO|NERI|ANS AO|TAMANG|GELIG|CABLINDA|CORBITA|YBAÑEZ|LEOP).*$/i, '');
            room = room.replace(/\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/, '');
            room = room.trim();
            room = room.substring(0, 60);
        }
        
        // Handle multi-day codes
        if (day === 'MTh' || day === 'MTH') {
            if (!course.meetings.some(m => m.day === 'M' && m.startTime === startTime)) {
                course.meetings.push({ day: 'M', startTime, endTime, room });
            }
            if (!course.meetings.some(m => m.day === 'Th' && m.startTime === startTime)) {
                course.meetings.push({ day: 'Th', startTime, endTime, room });
            }
        } else if (day === 'MW') {
            if (!course.meetings.some(m => m.day === 'M' && m.startTime === startTime)) {
                course.meetings.push({ day: 'M', startTime, endTime, room });
            }
            if (!course.meetings.some(m => m.day === 'W' && m.startTime === startTime)) {
                course.meetings.push({ day: 'W', startTime, endTime, room });
            }
        } else if (day === 'MWF') {
            if (!course.meetings.some(m => m.day === 'M' && m.startTime === startTime)) {
                course.meetings.push({ day: 'M', startTime, endTime, room });
            }
            if (!course.meetings.some(m => m.day === 'W' && m.startTime === startTime)) {
                course.meetings.push({ day: 'W', startTime, endTime, room });
            }
            if (!course.meetings.some(m => m.day === 'F' && m.startTime === startTime)) {
                course.meetings.push({ day: 'F', startTime, endTime, room });
            }
        } else if (day === 'TF' || day === 'TTh' || day === 'TTH') {
            if (!course.meetings.some(m => m.day === 'T' && m.startTime === startTime)) {
                course.meetings.push({ day: 'T', startTime, endTime, room });
            }
            if (!course.meetings.some(m => m.day === 'Th' && m.startTime === startTime)) {
                course.meetings.push({ day: 'Th', startTime, endTime, room });
            }
        } else {
            // Single day
            if (!course.meetings.some(m => m.day === day && m.startTime === startTime)) {
                course.meetings.push({ day, startTime, endTime, room });
            }
        }
    }
}

function renderTimetableGrid() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMap = { 'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 'Th': 'Thursday', 'F': 'Friday', 'S': 'Saturday' };
    const dayIndex = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5 };
    
    // Build time slots (5 AM to 11 PM)
    const times = [];
    for (let hour = 5; hour <= 23; hour++) {
        const period = hour >= 12 ? 'PM' : 'AM';
        let displayHour = hour % 12;
        if (displayHour === 0) displayHour = 12;
        times.push(`${displayHour}:00 ${period}`);
    }
    
    // Build events per day
    const dayEvents = {};
    for (const day of days) {
        dayEvents[day] = [];
    }
    
    for (const course of currentCourses) {
        if (!course.meetings || course.meetings.length === 0) continue;
        for (const meeting of course.meetings) {
            const fullDay = dayMap[meeting.day];
            if (!fullDay) continue;
            dayEvents[fullDay].push({
                course: course,
                meeting: meeting,
                start: timeToFloat(meeting.startTime),
                end: timeToFloat(meeting.endTime),
                startTime: meeting.startTime,
                endTime: meeting.endTime,
                day: fullDay
            });
        }
    }
    
    // Calculate overlaps with proper column assignment
    for (const day in dayEvents) {
        const events = dayEvents[day];
        events.sort((a, b) => a.start - b.start);
        
        // Build timeline of all start/end events
        const timeline = [];
        for (const event of events) {
            timeline.push({ time: event.start, type: 'start', event: event });
            timeline.push({ time: event.end, type: 'end', event: event });
        }
        timeline.sort((a, b) => a.time - b.time || (a.type === 'end' ? -1 : 1));
        
        // Track active events and assign columns
        let activeEvents = [];
        
        for (const item of timeline) {
            if (item.type === 'start') {
                const event = item.event;
                
                // Find occupied columns at this moment
                const occupied = new Set();
                for (const active of activeEvents) {
                    // Check if they overlap
                    if (active.start < event.end && active.end > event.start) {
                        occupied.add(active.column);
                    }
                }
                
                // Find first available column
                let col = 0;
                while (occupied.has(col)) col++;
                event.column = col;
                
                activeEvents.push(event);
                activeEvents.sort((a, b) => a.column - b.column);
            } else {
                const idx = activeEvents.indexOf(item.event);
                if (idx !== -1) activeEvents.splice(idx, 1);
            }
        }
        
        // SECOND PASS: Calculate max columns for each event
        // An event's maxColumns = max number of overlapping events at ANY point during its duration
        for (const event of events) {
            let maxOverlap = 1;
            for (const other of events) {
                if (other === event) continue;
                // Check if they overlap at any point
                if (other.start < event.end && other.end > event.start) {
                    // Count how many events are active at the overlap
                    // Check at the start of the overlap
                    const overlapStart = Math.max(event.start, other.start);
                    const activeAtOverlap = events.filter(e => 
                        e.start <= overlapStart && e.end > overlapStart
                    );
                    if (activeAtOverlap.length > maxOverlap) {
                        maxOverlap = activeAtOverlap.length;
                    }
                }
            }
            event.maxColumns = maxOverlap;
        }
    }
    
    // Build the table (grid only, no course blocks inside)
    let html = '<div class="timetable-wrapper" id="timetableWrapper">';
    html += '<table class="timetable" id="timetableTable">';
    html += '<thead><tr><th class="time-col">Time</th>';
    for (const day of days) {
        html += `<th>${day}</th>`;
    }
    html += '</tr></thead><tbody>';
    
    for (let slotIdx = 0; slotIdx < times.length; slotIdx++) {
        const timeLabel = times[slotIdx];
        const hour = 5 + slotIdx;
        html += `<tr class="time-row" data-hour="${hour}">`;
        html += `<td class="time-slot"><strong>${timeLabel}</strong></td>`;
        for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
            html += `<td class="empty-cell" data-day="${dayIdx}" data-hour="${hour}"></td>`;
        }
        html += `</tr>`;
    }
    
    html += `</tbody></table>`;
    html += `<div class="events-layer" id="eventsLayer"></div>`;
    html += `</div>`;

    document.getElementById('timetableGrid').innerHTML = html;
    
    // Position events after DOM is rendered
    requestAnimationFrame(() => {
        positionEvents(dayEvents);
    });
    
    // ADD THIS: Store dayEvents for resize handling
    window._dayEvents = dayEvents;
    
    // Remove old resize listener if exists
    if (window._resizeListener) {
        window.removeEventListener('resize', window._resizeListener);
    }
    
    // Add resize listener to reposition on window resize
    window._resizeListener = function() {
        if (window._dayEvents) {
            positionEvents(window._dayEvents);
        }
    };
    window.addEventListener('resize', window._resizeListener);
}

function positionEvents(dayEvents) {
    const table = document.getElementById('timetableTable');
    const eventsLayer = document.getElementById('eventsLayer');
    const wrapper = document.getElementById('timetableWrapper');
    
    if (!table || !eventsLayer || !wrapper) return;

    // Clear previous events
    eventsLayer.innerHTML = '';
    
    // ADD THIS - dayIndex mapping
    const dayIndex = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5 };
    
    // Wait for layout to settle
    setTimeout(() => {
        const tableRect = table.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        
        // Get cell dimensions from the first row
        const firstRow = table.querySelector('tbody tr');
        if (!firstRow) return;
        
        const cells = firstRow.querySelectorAll('td');
        if (cells.length < 2) return;
        
        // Get time column width
        const timeCell = cells[0];
        const timeColWidth = timeCell.offsetWidth;
        
        // Get day cell width (all day cells should be equal)
        const dayCell = cells[1];
        const dayWidth = dayCell.offsetWidth;
        
        // Get row height
        const rowHeight = firstRow.offsetHeight;
        
        // Get header height
        const thead = table.querySelector('thead');
        const headerHeight = thead ? thead.offsetHeight : 0;
        
        // Calculate total table width
        const totalWidth = timeColWidth + (dayWidth * 6);
        const totalHeight = table.offsetHeight;
        
        // Set events layer dimensions
        eventsLayer.style.width = totalWidth + 'px';
        eventsLayer.style.height = totalHeight + 'px';
        eventsLayer.style.position = 'absolute';
        eventsLayer.style.top = '0';
        eventsLayer.style.left = '0';
        eventsLayer.style.pointerEvents = 'none';
        eventsLayer.style.overflow = 'hidden';
        
        // Clear previous events
        eventsLayer.innerHTML = '';
        
        const GAP = 2;
        const START_HOUR = 5;
        
        // Position each event
        for (const day in dayEvents) {
            const events = dayEvents[day];
            const colIndex = dayIndex[day];  // ← Now dayIndex is defined
            if (colIndex === undefined) continue;
            
            for (const event of events) {
                // Calculate position
                const startOffset = (event.start - START_HOUR) * rowHeight + headerHeight;
                const duration = (event.end - event.start) * rowHeight;
                
                const eventWidth = (dayWidth / event.maxColumns) - GAP;
                const leftOffset = timeColWidth + (colIndex * dayWidth) + (event.column * (dayWidth / event.maxColumns)) + (GAP / 2);
                
                // Create course element
                const el = document.createElement('div');
                el.className = 'course-block absolute-course';
                el.style.position = 'absolute';
                el.style.top = startOffset + 'px';
                el.style.left = leftOffset + 'px';
                el.style.width = eventWidth + 'px';
                el.style.height = duration + 'px';
                el.style.minHeight = '30px';
                el.style.background = '#c8e0ff';
                el.style.borderRadius = '6px';
                el.style.padding = '4px 6px';
                el.style.border = '1px solid rgba(30, 64, 175, 0.15)';
                el.style.cursor = 'pointer';
                el.style.overflow = 'hidden';
                el.style.boxSizing = 'border-box';
                el.style.display = 'flex';
                el.style.flexDirection = 'column';
                el.style.pointerEvents = 'auto';
                
                // Build content
                let content = `<div class="course-code" style="font-weight: 700; color: #1e40af; font-size: clamp(0.4rem, 0.9vw, 0.7rem); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(event.course.code)}</div>`;
                if (event.course.subject && event.course.subject !== event.course.code) {
                    content += `<div class="course-subject" style="font-size: clamp(0.35rem, 0.8vw, 0.6rem); color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(event.course.subject.substring(0, 15))}</div>`;
                }
                content += `<div class="course-time" style="font-size: clamp(0.3rem, 0.7vw, 0.5rem); color: #64748b;">${escapeHtml(event.startTime)}-${escapeHtml(event.endTime)}</div>`;
                if (event.meeting.room) {
                    content += `<div class="course-room" style="font-size: clamp(0.25rem, 0.7vw, 0.5rem); color: #f59e0b;">${escapeHtml(event.meeting.room.substring(0, 8))}</div>`;
                }
                el.innerHTML = content;
                
                // Click handler
                el.addEventListener('click', function(e) {
                    e.stopPropagation();
                    editCourse(event.course.code, event.meeting.day, event.meeting.startTime);
                });
                
                eventsLayer.appendChild(el);
            }
        }
    }, 50);
}


function timeToFloat(timeStr) {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const meridian = match[3].toUpperCase();
    
    if (meridian === 'PM' && hours !== 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    
    return hours + (minutes / 60);
}

function getDaysArray(dayCode) {
    const map = {
        // Single days
        'M': ['Monday'],
        'T': ['Tuesday'],
        'W': ['Wednesday'],
        'Th': ['Thursday'],
        'F': ['Friday'],
        'S': ['Saturday'],
        
        // Two-day combinations
        'MF': ['Monday', 'Friday'],
        'MW': ['Monday', 'Wednesday'],
        'MTh': ['Monday', 'Thursday'],
        'MT': ['Monday', 'Tuesday'],
        'TTh': ['Tuesday', 'Thursday'],
        'TW': ['Tuesday', 'Wednesday'],
        'TF': ['Tuesday', 'Friday'],
        'WTh': ['Wednesday', 'Thursday'],
        'WF': ['Wednesday', 'Friday'],
        'ThF': ['Thursday', 'Friday'],
        'ThS': ['Thursday', 'Saturday'],
        'FS': ['Friday', 'Saturday'],
        
        // Three-day combinations
        'MWF': ['Monday', 'Wednesday', 'Friday'],
        'MThF': ['Monday', 'Thursday', 'Friday'],
        'MTW': ['Monday', 'Tuesday', 'Wednesday'],
        'TWS': ['Tuesday', 'Wednesday', 'Saturday'],
        'TThS': ['Tuesday', 'Thursday', 'Saturday'],
        'WFS': ['Wednesday', 'Friday', 'Saturday'],
        
        // Four-day combinations
        'MTWTh': ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        'MTWF': ['Monday', 'Tuesday', 'Wednesday', 'Friday'],
        'MTThF': ['Monday', 'Tuesday', 'Thursday', 'Friday'],
        'MWThF': ['Monday', 'Wednesday', 'Thursday', 'Friday'],
        
        // Five-day combinations
        'MTWThF': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        
        // Common aliases (some CORs use different formats)
        'TUE': ['Tuesday'],
        'WED': ['Wednesday'],
        'THU': ['Thursday'],
        'FRI': ['Friday'],
        'SAT': ['Saturday'],
        'SUN': ['Sunday'],
        'TTH': ['Tuesday', 'Thursday'],
        'MTH': ['Monday', 'Thursday'],
        'TTHF': ['Tuesday', 'Thursday', 'Friday'],
        'MWTH': ['Monday', 'Wednesday', 'Thursday'],
        
        // With spaces (some PDFs extract with spaces)
        'M W': ['Monday', 'Wednesday'],
        'M W F': ['Monday', 'Wednesday', 'Friday'],
        'T TH': ['Tuesday', 'Thursday'],
        'T TH F': ['Tuesday', 'Thursday', 'Friday'],
        'M TH': ['Monday', 'Thursday'],
    };
    
    // Direct lookup
    if (map[dayCode]) return map[dayCode];
    
    // Try uppercase version
    if (map[dayCode.toUpperCase()]) return map[dayCode.toUpperCase()];
    
    // Remove spaces and try again
    const noSpaces = dayCode.replace(/\s/g, '');
    if (map[noSpaces]) return map[noSpaces];
    
    // Handle "TF" (some CORs use TF for Tuesday/Thursday)
    if (dayCode === 'TF' || dayCode === 'T F') return ['Tuesday', 'Thursday'];
    
    // Handle "MTh" variations
    if (dayCode.match(/M\s*Th/i)) return ['Monday', 'Thursday'];
    
    // Handle "MWF" variations
    if (dayCode.match(/M\s*W\s*F/i)) return ['Monday', 'Wednesday', 'Friday'];
    
    // Fallback: try to parse individual letters
    const days = [];
    const letters = dayCode.toUpperCase().match(/[MTWFHS]/g);
    if (letters) {
        const letterMap = {
            'M': 'Monday',
            'T': 'Tuesday',
            'W': 'Wednesday',
            'F': 'Friday',
            'H': 'Thursday',  // Some use H for Thursday
            'S': 'Saturday'
        };
        for (const letter of letters) {
            if (letterMap[letter] && !days.includes(letterMap[letter])) {
                days.push(letterMap[letter]);
            }
        }
        if (days.length > 0) return days;
    }
    
    // Default: return as single item array
    console.warn(`Unknown day code: ${dayCode}`);
    return [dayCode];
}

function editCourse(courseCode, meetingDay, meetingStartTime) {
    const course = currentCourses.find(c => c.code === courseCode);
    if (!course) return;
    
    currentEditingCourse = course;
    
    // Find which meeting is being edited
    const meetingIndex = course.meetings.findIndex(m => m.day === meetingDay && m.startTime === meetingStartTime);
    currentEditingMeetingIndex = meetingIndex;
    const meeting = course.meetings[meetingIndex] || course.meetings[0];
    
    document.getElementById('editCode').value = course.code;
    document.getElementById('editSubject').value = course.subject || '';
    document.getElementById('editDay').value = meeting.day || '';
    document.getElementById('editStartTime').value = meeting.startTime || '';
    document.getElementById('editEndTime').value = meeting.endTime || '';
    document.getElementById('editRoom').value = meeting.room || '';
    document.getElementById('editFaculty').value = course.faculty || '';
    
    validateEditModal();
    
    // Delete button always visible
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.style.display = 'inline-block';
    }
    
    document.getElementById('editModal').style.display = 'block';
}

function saveCourseEdits() {
    if (!currentEditingCourse) return;
    
    // Update course basic info
    currentEditingCourse.code = document.getElementById('editCode').value.trim();
    currentEditingCourse.subject = document.getElementById('editSubject').value.trim();
    currentEditingCourse.faculty = document.getElementById('editFaculty').value.trim();
    
    // Update the specific meeting
    const newDay = document.getElementById('editDay').value;
    const newStartTime = document.getElementById('editStartTime').value;
    const newEndTime = document.getElementById('editEndTime').value;
    const newRoom = document.getElementById('editRoom').value.trim();
    
    if (currentEditingMeetingIndex !== null && currentEditingCourse.meetings[currentEditingMeetingIndex]) {
        // Update existing meeting
        currentEditingCourse.meetings[currentEditingMeetingIndex] = {
            day: newDay,
            startTime: newStartTime,
            endTime: newEndTime,
            room: newRoom
        };
    } else {
        // Fallback: update all meetings (should not happen normally)
        const expandedDays = getDaysArray(newDay);
        const dayShortMap = { 'Monday': 'M', 'Tuesday': 'T', 'Wednesday': 'W', 'Thursday': 'Th', 'Friday': 'F', 'Saturday': 'S' };
        
        currentEditingCourse.meetings = [];
        for (const fullDay of expandedDays) {
            currentEditingCourse.meetings.push({
                day: dayShortMap[fullDay],
                startTime: newStartTime,
                endTime: newEndTime,
                room: newRoom
            });
        }
    }
    
    renderTimetableGrid();
    showStatus('Schedule updated successfully!', 'success');
    closeModal();
}

function floatToTime(floatVal) {
    let hours = Math.floor(floatVal);
    const minutes = Math.round((floatVal - hours) * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    let displayHour = hours % 12;
    if (displayHour === 0) displayHour = 12;
    const minuteStr = minutes === 0 ? '00' : minutes;
    return `${displayHour}:${minuteStr} ${period}`;
}



function addCourse() {
    const code = document.getElementById('addCode').value.trim();
    const subject = document.getElementById('addSubject').value.trim();
    const faculty = document.getElementById('addFaculty').value.trim();
    const day = document.getElementById('addDay').value;
    const startTime = document.getElementById('addStartTime').value;
    const endTime = document.getElementById('addEndTime').value;
    const room = document.getElementById('addRoom').value.trim();
    
    // Clear previous error styling
    document.getElementById('addCode').style.borderColor = '';
    document.getElementById('addCode').style.backgroundColor = '';
    
    // Validation
    if (!code) {
        showStatus('Course Code is required.', 'error');
        validateAddModal();
        // Highlight the empty field
        document.getElementById('addCode').style.borderColor = '#ef4444';
        document.getElementById('addCode').style.backgroundColor = '#fef2f2';
        document.getElementById('addCode').focus();
        return;
    }
    
    // Optional: Add validation for duplicate course code warning
    const existingCourse = currentCourses.find(c => c.code === code);
    if (existingCourse) {
        if (!confirm(`"${code}" already exists.\n\nDo you want to add a new meeting time to this existing course?`)) {
            return;
        }
    }
    
    // Rest of your addCourse code continues here...
    const expandedDays = getDaysArray(day);
    const dayShortMap = { 'Monday': 'M', 'Tuesday': 'T', 'Wednesday': 'W', 'Thursday': 'Th', 'Friday': 'F', 'Saturday': 'S' };
    
    const meetings = [];
    for (const fullDay of expandedDays) {
        meetings.push({
            day: dayShortMap[fullDay],
            startTime: startTime,
            endTime: endTime,
            room: room
        });
    }
    
    // Check if course already exists
    let existingCourseFind = currentCourses.find(c => c.code === code);
    
    if (existingCourseFind) {
        // Add meetings to existing course
        for (const meeting of meetings) {
            if (!existingCourseFind.meetings.some(m => m.day === meeting.day && m.startTime === meeting.startTime)) {
                existingCourseFind.meetings.push(meeting);
            }
        }
        if (subject) existingCourseFind.subject = subject;
        if (faculty) existingCourseFind.faculty = faculty;
    } else {
        // Create new course
        currentCourses.push({
            code: code,
            subject: subject,
            faculty: faculty,
            meetings: meetings
        });
    }
    
    renderTimetableGrid();
    closeAddModal();
    showStatus('Class added successfully!', 'success');
}

function openAddModal() {
    document.getElementById('addCode').value = '';
    document.getElementById('addSubject').value = '';
    document.getElementById('addFaculty').value = '';
    document.getElementById('addDay').value = 'M';
    document.getElementById('addStartTime').value = '7:00 AM';
    document.getElementById('addEndTime').value = '8:30 AM';
    document.getElementById('addRoom').value = '';
    
    // Disable save button initially
    const saveBtn = document.getElementById('saveAddBtn');
    if (saveBtn) saveBtn.disabled = true;
    
    // Hide warning
    const warning = document.getElementById('addConflictWarning');
    if (warning) warning.style.display = 'none';
    
    document.getElementById('addModal').style.display = 'block';
}

function closeAddModal() {
    document.getElementById('addModal').style.display = 'none';
}


let pendingDeleteCourse = null;
let pendingDeleteMeetingIndex = null;

function deleteCurrentMeeting() {
    if (!currentEditingCourse) return;
    
    pendingDeleteCourse = currentEditingCourse;
    pendingDeleteMeetingIndex = currentEditingMeetingIndex;
    
    let message = '';
    if (pendingDeleteMeetingIndex !== null && pendingDeleteCourse.meetings[pendingDeleteMeetingIndex]) {
        const meeting = pendingDeleteCourse.meetings[pendingDeleteMeetingIndex];
        message = `Are you sure you want to delete <strong>${escapeHtml(pendingDeleteCourse.code)}</strong><br>on <strong>${meeting.day}</strong> at <strong>${meeting.startTime}</strong>?`;
    } else {
        message = `Are you sure you want to delete <strong>${escapeHtml(pendingDeleteCourse.code)}</strong>?`;
    }
    
    document.getElementById('deleteConfirmMessage').innerHTML = message;
    document.getElementById('deleteConfirmModal').style.display = 'block';
}


function validateEditModal() {
    const courseCode = document.getElementById('editCode').value.trim();
    const saveBtn = document.getElementById('saveBtn');
    
    if (saveBtn) {
        if (!courseCode) {
            saveBtn.disabled = true;
        } else {
            saveBtn.disabled = false;
        }
    }
}

function validateAddModal() {
    const courseCode = document.getElementById('addCode').value.trim();
    const saveBtn = document.getElementById('saveAddBtn');
    
    if (saveBtn) {
        if (!courseCode) {
            saveBtn.disabled = true;
        } else {
            saveBtn.disabled = false;
        }
    }
}


function confirmDelete() {
    if (!pendingDeleteCourse) {
        closeDeleteModal();
        return;
    }
    
    if (pendingDeleteMeetingIndex !== null && pendingDeleteCourse.meetings.length > 1) {
        // Remove just this meeting
        pendingDeleteCourse.meetings.splice(pendingDeleteMeetingIndex, 1);
    } else {
        // Remove the entire course
        const courseIndex = currentCourses.findIndex(c => c.code === pendingDeleteCourse.code);
        if (courseIndex !== -1) {
            currentCourses.splice(courseIndex, 1);
        }
    }
    
    renderTimetableGrid();
    closeModal(); // Close edit modal
    closeDeleteModal();
    showStatus('Class deleted successfully!', 'success');
    
    // Clean up
    pendingDeleteCourse = null;
    pendingDeleteMeetingIndex = null;
}

function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').style.display = 'none';
    pendingDeleteCourse = null;
    pendingDeleteMeetingIndex = null;
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingCourse = null;
}



function resetToOriginal() {
    if (originalCourses.length) {
        currentCourses = JSON.parse(JSON.stringify(originalCourses));
        renderTimetableGrid();
        showStatus('Reset to original schedule.', 'success');
    }
}

// ========== LOCKSREEN WALLPAPER GENERATOR ==========
let lockscreenPadding = 5;

async function generateLockscreen() {
    if (currentCourses.length === 0) {
        showStatus('Please upload a COR first.', 'error');
        return;
    }
    
    // Open settings modal instead of generating immediately
    openLockscreenModal();
}

function openLockscreenModal() {
    // Hide custom container by default
    const customContainer = document.getElementById('lockscreenCustomContainer');
    if (customContainer) {
        customContainer.style.display = 'none';
    }
    
    // Set default padding
    const paddingSlider = document.getElementById('paddingSlider');
    const paddingValue = document.getElementById('paddingValue');
    if (paddingSlider) {
        paddingSlider.value = lockscreenPadding || 5;
        paddingValue.textContent = lockscreenPadding || 5;
    }
    
    // Load saved theme
    const themeSelect = document.getElementById('lockscreenTheme');
    if (themeSelect) {
        const savedTheme = localStorage.getItem('lockscreenTheme') || 'default';
        themeSelect.value = savedTheme;
    }
    
    document.getElementById('lockscreenModal').style.display = 'block';
}

function closeLockscreenModal() {
    document.getElementById('lockscreenModal').style.display = 'none';
}

async function generateLockscreenImage() {
    closeLockscreenModal();
    showLoading(true);
    
    // Get selected size
    const sizeSelect = document.getElementById('lockscreenSize');
    let targetWidth = 1080;
    let targetHeight = 1920;
    
    if (sizeSelect && sizeSelect.value !== 'custom') {
        const [w, h] = sizeSelect.value.split(',').map(Number);
        targetWidth = w || 1080;
        targetHeight = h || 1920;
    } else if (sizeSelect && sizeSelect.value === 'custom') {
        const customWidth = parseInt(document.getElementById('lockscreenCustomWidth')?.value);
        const customHeight = parseInt(document.getElementById('lockscreenCustomHeight')?.value);
        targetWidth = (customWidth && customWidth > 0) ? customWidth : 1080;
        targetHeight = (customHeight && customHeight > 0) ? customHeight : 1920;
    }
    
    if (!targetWidth || targetWidth <= 0) targetWidth = 1080;
    if (!targetHeight || targetHeight <= 0) targetHeight = 1920;
    
    // Get padding
    const padding = parseInt(document.getElementById('paddingSlider').value) / 100;
    lockscreenPadding = parseInt(document.getElementById('paddingSlider').value);
    
    // Get selected theme
    const themeSelect = document.getElementById('lockscreenTheme');
    const themeKey = themeSelect ? themeSelect.value : 'default';
    const theme = LOCKSREEN_THEMES[themeKey] || LOCKSREEN_THEMES.default;
    
    // Save theme preference
    localStorage.setItem('lockscreenTheme', themeKey);
    
    const dayMap = { 'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 'Th': 'Thursday', 'F': 'Friday', 'S': 'Saturday' };
    const fullDayMap = { 'Monday': 'MON', 'Tuesday': 'TUE', 'Wednesday': 'WED', 'Thursday': 'THU', 'Friday': 'FRI', 'Saturday': 'SAT' };
    
    // Group courses by day using meetings
    const scheduleByDay = {};
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    daysOrder.forEach(day => { scheduleByDay[day] = []; });
    
    for (const course of currentCourses) {
        if (!course.meetings || course.meetings.length === 0) continue;
        for (const meeting of course.meetings) {
            const fullDay = dayMap[meeting.day];
            if (!fullDay) continue;
            scheduleByDay[fullDay].push({
                code: course.code,
                name: course.subject || course.code,
                startTime: meeting.startTime,
                endTime: meeting.endTime,
                room: meeting.room
            });
        }
    }
    
    // Sort classes by time for each day
    for (const day in scheduleByDay) {
        scheduleByDay[day].sort((a, b) => timeToFloat(a.startTime) - timeToFloat(b.startTime));
    }
    
    const daysWithClasses = daysOrder.filter(day => scheduleByDay[day].length > 0);
    
    if (daysWithClasses.length === 0) {
        showStatus('No classes found in schedule.', 'error');
        showLoading(false);
        return;
    }
    
    // Build lockscreen HTML with theme colors
    const renderWidth = 1080;
    const renderHeight = 1920;
    
    let html = `<div class="lockscreen-wallpaper" id="lockscreenWallpaper" style="
        width: ${renderWidth}px;
        height: ${renderHeight}px;
        min-height: ${renderHeight}px;
        background: ${theme.background};
        padding: 60px 40px 40px 40px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
    ">
        <div class="lockscreen-title" style="text-align: center; margin-bottom: 32px; flex-shrink: 0;">
            <h1 style="font-family: 'Playfair Display', 'Georgia', serif; font-size: 5rem; font-weight: 600; color: ${theme.title}; letter-spacing: -0.5px; margin: 0;">Class Schedule</h1>
        </div>
        <div class="lockscreen-schedule" style="display: flex; flex-direction: column; gap: 50px; flex: 1; overflow: hidden; justify-content: center;">
    `;
    
    for (const day of daysWithClasses) {
        const classes = scheduleByDay[day];
        const shortDay = fullDayMap[day];
        
        html += `<div class="day-card" style="
            background: ${theme.card};
            border-radius: 24px;
            padding: 32px 28px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
            flex-shrink: 0;
        ">
            <div class="day-header" style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 2px solid ${theme.border};
            ">
                <span class="day-name" style="font-size: 2.2rem; font-weight: 700; color: ${theme.dayName}; letter-spacing: 0.5px;">${shortDay}</span>
            </div>
            <div class="class-list" style="display: flex; flex-direction: column; gap: 14px;">
        `;
        
        for (const cls of classes) {
            const timeRange = `${cls.startTime} – ${cls.endTime}`;
            html += `
                <div class="class-item" style="
                    display: flex;
                    align-items: baseline;
                    gap: 20px;
                    padding: 8px 0;
                    flex-wrap: nowrap;
                ">
                    <div class="class-time" style="
                        min-width: 160px;
                        font-size: 1.4rem;
                        font-weight: 500;
                        color: ${theme.time};
                        font-family: 'SF Mono', 'Menlo', monospace;
                        letter-spacing: -0.3px;
                        flex-shrink: 0;
                    ">${escapeHtml(timeRange)}</div>
                    <div class="class-name" style="
                        flex: 1;
                        font-size: 1.5rem;
                        font-weight: 600;
                        color: ${theme.text};
                        letter-spacing: -0.3px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    ">${escapeHtml(cls.name.substring(0, 40))}</div>
                    <div class="class-room" style="
                        font-size: 1.3rem;
                        font-weight: 500;
                        color: ${theme.room};
                        min-width: 120px;
                        text-align: right;
                        flex-shrink: 0;
                    ">${escapeHtml(cls.room || 'TBA')}</div>
                </div>
            `;
        }
        html += `</div></div>`;
    }
    
    html += `
        </div>
    </div>`;
    
    // Store original and show lockscreen
    const gridContainer = document.getElementById('timetableGrid');
    const originalContent = gridContainer.innerHTML;
    gridContainer.innerHTML = html;
    
    // Force reflow to ensure styles are applied
    document.body.offsetHeight;
    
    setTimeout(async () => {
        const element = document.getElementById('lockscreenWallpaper');
        
        if (typeof html2canvas === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }
        
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#faf7f0',
                logging: false,
                width: renderWidth,
                height: renderHeight,
                useCORS: true,
                allowTaint: true
            });
            
            // If the target resolution is different, resize the canvas
            let finalCanvas = canvas;
            if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                finalCanvas = document.createElement('canvas');
                finalCanvas.width = targetWidth;
                finalCanvas.height = targetHeight;
                const ctx = finalCanvas.getContext('2d');
                ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
            }
            
            // Apply padding if needed
            if (padding > 0) {
                const paddedCanvas = document.createElement('canvas');
                paddedCanvas.width = targetWidth;
                paddedCanvas.height = targetHeight;
                const ctx = paddedCanvas.getContext('2d');
                // Use the theme's background color instead of hardcoded white
                ctx.fillStyle = theme.background;  // ← FIXED!
                ctx.fillRect(0, 0, targetWidth, targetHeight);
                
                const paddingPx = padding * Math.min(targetWidth, targetHeight);
                const scaledWidth = targetWidth - (paddingPx * 2);
                const scaledHeight = targetHeight - (paddingPx * 2);
                const x = (targetWidth - scaledWidth) / 2;
                const y = (targetHeight - scaledHeight) / 2;
                
                ctx.drawImage(finalCanvas, x, y, scaledWidth, scaledHeight);
                finalCanvas = paddedCanvas;
            }
            
            const link = document.createElement('a');
            link.download = `lockscreen_${targetWidth}x${targetHeight}.png`;
            link.href = finalCanvas.toDataURL('image/png');
            link.click();
            
            showStatus(`Lockscreen wallpaper saved! (${targetWidth} x ${targetHeight})`, 'success');
        } catch (error) {
            console.error('Error:', error);
            showStatus('Error generating image', 'error');
        } finally {
            gridContainer.innerHTML = originalContent;
            showLoading(false);
        }
    }, 300);
}


function exportICS() {
    if (currentCourses.length === 0) {
        showStatus('No schedule to export. Upload your COR first.', 'error');
        return;
    }
    
    const dayMap = { 'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 'Th': 'Thursday', 'F': 'Friday', 'S': 'Saturday' };
    const daysOfWeek = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5 };
    
    // Get current date to determine which week to use
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Find the nearest Monday
    const mondayOffset = (currentDay === 0) ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    // Build ICS file
    let ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//USTP Schedule Maker//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];
    
    let eventCount = 0;
    
    for (const course of currentCourses) {
        if (!course.meetings || course.meetings.length === 0) continue;
        
        for (const meeting of course.meetings) {
            const fullDay = dayMap[meeting.day];
            if (!fullDay) continue;
            
            const dayIndex = daysOfWeek[fullDay];
            if (dayIndex === undefined) continue;
            
            // Calculate date for this day
            const eventDate = new Date(monday);
            eventDate.setDate(monday.getDate() + dayIndex);
            
            // Parse start and end times
            const startParts = meeting.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            const endParts = meeting.endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!startParts || !endParts) continue;
            
            let startHour = parseInt(startParts[1]);
            const startMinute = parseInt(startParts[2]);
            const startMeridian = startParts[3].toUpperCase();
            
            let endHour = parseInt(endParts[1]);
            const endMinute = parseInt(endParts[2]);
            const endMeridian = endParts[3].toUpperCase();
            
            // Convert to 24-hour
            if (startMeridian === 'PM' && startHour !== 12) startHour += 12;
            if (startMeridian === 'AM' && startHour === 12) startHour = 0;
            if (endMeridian === 'PM' && endHour !== 12) endHour += 12;
            if (endMeridian === 'AM' && endHour === 12) endHour = 0;
            
            // Format date for ICS (YYYYMMDDTHHMMSS)
            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}${month}${day}`;
            };
            
            const dateStr = formatDate(eventDate);
            const startTimeStr = String(startHour).padStart(2, '0') + String(startMinute).padStart(2, '0') + '00';
            const endTimeStr = String(endHour).padStart(2, '0') + String(endMinute).padStart(2, '0') + '00';
            
            // Build event details
            const subject = `${course.code} - ${course.subject || course.code}`;
            const location = meeting.room || 'TBA';
            const description = `Course: ${course.code}\nSubject: ${course.subject || ''}\nFaculty: ${course.faculty || 'TBA'}\nRoom: ${meeting.room || 'TBA'}`;
            
            // Generate a unique ID for this event
            const uid = `${course.code}-${dateStr}-${startTimeStr}-${Math.random().toString(36).substr(2, 8)}`;
            
            // Get day abbreviation for RRULE (e.g., MO, TU, WE, TH, FR, SA)
            const dayAbbr = fullDay.substring(0, 2).toUpperCase();
            
            ics.push(
                'BEGIN:VEVENT',
                `UID:${uid}@ustp-schedule-maker`,
                `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                `DTSTART:${dateStr}T${startTimeStr}`,
                `DTEND:${dateStr}T${endTimeStr}`,
                `SUMMARY:${subject}`,
                `LOCATION:${location}`,
                `DESCRIPTION:${description}`,
                `RRULE:FREQ=WEEKLY;BYDAY=${dayAbbr}`,
                'END:VEVENT'
            );
            
            eventCount++;
        }
    }
    
    ics.push('END:VCALENDAR');
    
    if (eventCount === 0) {
        showStatus('No valid events to export. Check your schedule.', 'error');
        return;
    }
    
    // Create and download the ICS file
    const icsContent = ics.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MySchedule_${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    showStatus(
        `Calendar exported! ${eventCount} course(s) added.<br><br>` +
        `The .ics file has been downloaded to your device.<br>` +
        `🛈 You can import this file to Google Calendar, Apple Calendar, Outlook, or any calendar app that supports iCalendar (.ics) format.`,
        'success'
    );
}


function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 10000);
}

function clearStatus() {
    document.getElementById('status').innerHTML = '';
}

window.editCourse = editCourse;