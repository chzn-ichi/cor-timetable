// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let originalCourses = [];
let currentCourses = [];
let currentStudent = {};
let currentEditingCourse = null;
let currentEditingMeetingIndex = null;


document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const resetBtn = document.getElementById('resetBtn');
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
                <strong>📌 Demo Mode:</strong> Upload your COR PDF (IT or CE) to see your actual schedule.
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
        
        // Extract room - simplified approach
        let room = "";
        
        // Try to extract room after slash or parentheses
        const slashMatch = afterTime.match(/^\s*\/\s*([^\/\s]+(?:\s+[^\/\s]+)*?)(?=\s+\/|\s+[A-Z]|$)/);
        if (slashMatch) {
            room = slashMatch[1].trim();
        }
        
        // Try parentheses
        if (!room) {
            const parenMatch = afterTime.match(/\(([^)]+)\)/);
            if (parenMatch) {
                room = parenMatch[1];
            }
        }
        
        // Try simple room number
        if (!room) {
            const simpleRoom = afterTime.match(/\d{2,3}-\d{3,4}/);
            if (simpleRoom) {
                room = simpleRoom[0];
            }
        }
        
        // Try modular classroom
        if (!room) {
            const modularRoom = afterTime.match(/Modular Classroom\s*\d+/i);
            if (modularRoom) {
                room = modularRoom[0];
            }
        }
        
        // Try lab room
        if (!room) {
            const labRoom = afterTime.match(/[A-Za-z]+\s*Lab\s*\d+/i);
            if (labRoom) {
                room = labRoom[0];
            }
        }
        
        // Clean up room - remove any leftover faculty-like text
        if (room) {
            room = room.replace(/\s+(Mr\.|Ms\.|Mrs\.|Dr\.|MA\.|Ma\.|Prof\.|Engr\.).*$/i, '');
            room = room.replace(/\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/, '');
            room = room.substring(0, 50);
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
    const dayShortMap = { 'Monday': 'M', 'Tuesday': 'T', 'Wednesday': 'W', 'Thursday': 'Th', 'Friday': 'F', 'Saturday': 'S' };
    
    // Build time slots (5 AM to 11 PM)
    const times = [];
    for (let hour = 5; hour <= 23; hour++) {
        const period = hour >= 12 ? 'PM' : 'AM';
        let displayHour = hour % 12;
        if (displayHour === 0) displayHour = 12;
        times.push(`${displayHour}:00 ${period}`);
    }
    
    // Build schedule lookup: day + hour -> course info
    const scheduleMap = {};
    
    for (const course of currentCourses) {
        if (!course.meetings || course.meetings.length === 0) continue;
        
        for (const meeting of course.meetings) {
            const fullDay = dayMap[meeting.day];
            if (!fullDay) continue;
            
            const startHour = timeToFloat(meeting.startTime);
            const endHour = timeToFloat(meeting.endTime);
            
            // Store in map by day and hour
            const key = fullDay + '|' + startHour;
            if (!scheduleMap[key]) {
                scheduleMap[key] = [];
            }
            scheduleMap[key].push({
                course: course,
                meeting: meeting,
                start: startHour,
                end: endHour,
                startTime: meeting.startTime,
                endTime: meeting.endTime
            });
        }
    }
    
    // Build the table
    let html = '<div class="timetable-wrapper">';
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
            const day = days[dayIdx];
            const key = day + '|' + hour;
            
            // Check if there's a course at this hour
            const coursesAtThisHour = scheduleMap[key] || [];
            
            if (coursesAtThisHour.length > 0) {
                // Get the first course (handle overlaps later)
                const entry = coursesAtThisHour[0];
                const startMinute = (entry.start - Math.floor(entry.start)) * 60;
                const endMinute = (entry.end - Math.floor(entry.end)) * 60;
                const startDisplay = startMinute === 0 ? '' : `:${String(startMinute).padStart(2, '0')}`;
                const endDisplay = endMinute === 0 ? '' : `:${String(endMinute).padStart(2, '0')}`;
                
                // Check if this course spans multiple hours
                const span = Math.ceil(entry.end) - Math.floor(entry.start);
                
                html += `<td class="course-cell-td" data-day="${dayIdx}" data-hour="${hour}" style="position: relative; padding: 2px;">`;
                html += `<div class="course-block" 
                              style="background: #c8e0ff; 
                                     border-radius: 6px; 
                                     padding: 3px 5px; 
                                     height: 100%; 
                                     min-height: 50px;
                                     display: flex; 
                                     flex-direction: column; 
                                     justify-content: center;
                                     border: 1px solid rgba(30, 64, 175, 0.15);
                                     cursor: pointer;
                                     overflow: hidden;"
                              onclick="editCourse('${escapeHtml(entry.course.code)}', '${escapeHtml(entry.meeting.day)}', '${escapeHtml(entry.meeting.startTime)}')">`;
                html += `<div class="course-code" style="font-weight: 700; color: #1e40af; font-size: clamp(0.5rem, 0.8vw, 0.7rem); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(entry.course.code)}</div>`;
                if (entry.course.subject && entry.course.subject !== entry.course.code) {
                    html += `<div class="course-subject" style="font-size: clamp(0.4rem, 0.6vw, 0.6rem); color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(entry.course.subject.substring(0, 15))}</div>`;
                }
                html += `<div class="course-time" style="font-size: clamp(0.35rem, 0.5vw, 0.5rem); color: #64748b;">${escapeHtml(entry.startTime)}-${escapeHtml(entry.endTime)}</div>`;
                if (entry.meeting.room) {
                    html += `<div class="course-room" style="font-size: clamp(0.3rem, 0.4vw, 0.45rem); color: #f59e0b;">${escapeHtml(entry.meeting.room.substring(0, 8))}</div>`;
                }
                html += `</div>`;
                html += `</td>`;
            } else {
                html += `<td class="empty-cell" data-day="${dayIdx}" data-hour="${hour}"></td>`;
            }
        }
        html += `</tr>`;
    }
    
    html += `</tbody></table>`;
    html += `</div>`;
    
    document.getElementById('timetableGrid').innerHTML = html;
    
    // Now handle rowspans for courses that span multiple hours
    handleRowSpans();
}

// Handle rowspans for courses that span multiple hours
function handleRowSpans() {
    const table = document.getElementById('timetableTable');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    const dayMap = { 'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 'Th': 'Thursday', 'F': 'Friday', 'S': 'Saturday' };
    
    // Collect all course blocks by day and start time
    const courseBlocks = {};
    
    for (const course of currentCourses) {
        if (!course.meetings) continue;
        for (const meeting of course.meetings) {
            const fullDay = dayMap[meeting.day];
            if (!fullDay) continue;
            const startHour = Math.floor(timeToFloat(meeting.startTime));
            const endHour = Math.ceil(timeToFloat(meeting.endTime));
            const span = endHour - startHour;
            
            if (span > 0) {
                const key = fullDay + '|' + startHour;
                if (!courseBlocks[key]) {
                    courseBlocks[key] = [];
                }
                courseBlocks[key].push({
                    course: course,
                    meeting: meeting,
                    span: span,
                    startHour: startHour,
                    endHour: endHour
                });
            }
        }
    }
    
    // Process each row
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const cells = row.querySelectorAll('td');
        const hour = parseInt(row.dataset.hour);
        
        // Skip time column (index 0)
        for (let colIndex = 1; colIndex < cells.length; colIndex++) {
            const cell = cells[colIndex];
            const dayIndex = colIndex - 1;
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const day = days[dayIndex];
            const key = day + '|' + hour;
            
            // Check if this cell has a course that should span
            const block = courseBlocks[key];
            if (block && block.length > 0) {
                const entry = block[0];
                // Check if this is the start of the course (not a continuation)
                const startKey = day + '|' + entry.startHour;
                if (key === startKey) {
                    // This is the start - set rowspan
                    const courseCell = cell.querySelector('.course-block');
                    if (courseCell) {
                        const parentTd = courseCell.closest('td');
                        if (parentTd) {
                            parentTd.rowSpan = entry.span;
                            parentTd.style.verticalAlign = 'middle';
                            
                            // Remove the cell from subsequent rows
                            for (let i = 1; i < entry.span; i++) {
                                const nextRow = rows[rowIndex + i];
                                if (nextRow) {
                                    const nextCells = nextRow.querySelectorAll('td');
                                    if (nextCells[colIndex]) {
                                        nextCells[colIndex].style.display = 'none';
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
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
let lockscreenPadding = 10;

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
        paddingSlider.value = lockscreenPadding || 10;
        paddingValue.textContent = lockscreenPadding || 10;
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
    
    // Build lockscreen HTML with FIXED SIZE - MORE SPACIOUS LAYOUT
    const renderWidth = 1080;
    const renderHeight = 1920;
    
    let html = `<div class="lockscreen-wallpaper" id="lockscreenWallpaper" style="
        width: ${renderWidth}px;
        height: ${renderHeight}px;
        min-height: ${renderHeight}px;
        background: #faf7f0;
        padding: 60px 40px 40px 40px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
    ">
        <div class="lockscreen-title" style="text-align: center; margin-bottom: 32px; flex-shrink: 0;">
            <h1 style="font-family: 'Playfair Display', 'Georgia', serif; font-size: 5rem; font-weight: 600; color: #2c3e4e; letter-spacing: -0.5px; margin: 0;">Class Schedule</h1>
        </div>
        <div class="lockscreen-schedule" style="display: flex; flex-direction: column; gap: 50px; flex: 1; overflow: hidden; justify-content: center;">
    `;
    
    for (const day of daysWithClasses) {
        const classes = scheduleByDay[day];
        const shortDay = fullDayMap[day];
        
        html += `<div class="day-card" style="
            background: #e8f0fe;
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
                border-bottom: 2px solid rgba(44, 62, 78, 0.1);
            ">
                <span class="day-name" style="font-size: 2.2rem; font-weight: 700; color: #2c3e4e; letter-spacing: 0.5px;">${shortDay}</span>
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
                        color: #6b8a9e;
                        font-family: 'SF Mono', 'Menlo', monospace;
                        letter-spacing: -0.3px;
                        flex-shrink: 0;
                    ">${escapeHtml(timeRange)}</div>
                    <div class="class-name" style="
                        flex: 1;
                        font-size: 1.5rem;
                        font-weight: 600;
                        color: #1a2a3a;
                        letter-spacing: -0.3px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    ">${escapeHtml(cls.name.substring(0, 40))}</div>
                    <div class="class-room" style="
                        font-size: 1.3rem;
                        font-weight: 500;
                        color: #5a7a8e;
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
                ctx.fillStyle = '#faf7f0';
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
    }, 4000);
}

function clearStatus() {
    document.getElementById('status').innerHTML = '';
}

window.editCourse = editCourse;