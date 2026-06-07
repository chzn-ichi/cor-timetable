// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let originalCourses = [];
let currentCourses = [];
let currentStudent = {};
let currentEditingCourse = null;

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const resetBtn = document.getElementById('resetBtn');
    const lockscreenBtn = document.getElementById('lockscreenBtn');
    
    fileInput.addEventListener('change', handleFileUpload);
    resetBtn.addEventListener('click', resetToOriginal);
    if (lockscreenBtn) lockscreenBtn.addEventListener('click', generateLockscreen);
    
    // Modal close handlers
    const modal = document.getElementById('editModal');
    const closeBtn = document.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveBtn');
    
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;
    if (saveBtn) saveBtn.onclick = saveCourseEdits;
    
    // Click outside to close
    window.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };
    
    showDemoGrid();
});

function showDemoGrid() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const times = [];
    for (let hour = 0; hour <= 23; hour++) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        times.push(`${displayHour}:00 ${period}`);
    }
    
    let html = '<div class="timetable-wrapper">';
    html += '<table class="timetable">';
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
        showStatus(`✅ Loaded ${courses.length} courses! Click any class to edit.`, 'success');
        
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
    
    // Parse rows - need to look ahead for additional schedules
    let currentCourse = null;
    
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const texts = row.map(r => r.str.trim()).filter(Boolean);
        if (texts.length === 0) continue;
        
        const first = texts[0];
        
        // Expanded course code detection
        const isCourseCode = (
            /^[A-Za-z]{2,6}\d{2,4}$/i.test(first.replace(/\s/g, "")) ||
            /^(Ethc|Rizal|PATH\s*FIT\s*\d+|PurCom|RPH|TCW|MMW|STS)$/i.test(first)
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
            let foundSection = false;

            for (let i = 1; i < texts.length; i++) {
                const text = texts[i];
                
                // Stop if we hit a section code pattern
                if (/^[A-Z]{3,10}_[A-Z]{2,4}_\d+[A-Z]?$/i.test(text)) {
                    foundSection = true;
                    break;
                }
                
                // Stop if we hit schedule
                if (/(AM|PM)/i.test(text)) break;
                
                // Stop if we hit faculty
                if (text.match(/^(Mr\.|Ms\.|Mrs\.|Dr\.|MA\.|Ma\.|Prof\.)/i)) break;
                
                // Stop if we hit units
                if (/^\d+$/.test(text) && text.length <= 2) break;
                
                // Add to subject
                if (text.length > 1) {
                    subjectParts.push(text);
                }
            }

            currentCourse.subject = subjectParts.join(" ").trim();
            
            // Extract faculty from current row
            for (let i = 0; i < texts.length; i++) {
                if (texts[i].match(/^(Mr\.|Ms\.|Mrs\.|Dr\.|MA\.|Ma\.|Prof\.)/i)) {
                    currentCourse.faculty = texts.slice(i).join(" ").trim();
                    break;
                }
            }
            
            // Extract ALL schedule patterns from current row
            const rowText = texts.join(" ");
            extractSchedulesFromText(rowText, currentCourse);
        }
        
        // If we have a current course, also check THIS row for additional schedules
        // (for schedules that appear on separate lines after the course code)
        if (currentCourse) {
            const rowText = texts.join(" ");
            extractSchedulesFromText(rowText, currentCourse);
        }
    }
    
    // Save last course
    if (currentCourse && currentCourse.meetings.length > 0) {
        courses.push(currentCourse);
    }
    
    console.log("Parsed courses with meetings:", courses.map(c => ({
        code: c.code,
        subject: c.subject,
        meetings: c.meetings
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
    
    const times = [];
    for (let hour = 0; hour <= 23; hour++) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        times.push(`${displayHour}:00 ${period}`);
    }
    
    const grid = {};
    for (const day of days) {
        grid[day] = {};
        for (let i = 0; i < times.length; i++) {
            grid[day][i] = null;
        }
    }
    
    // Iterate over course.meetings
    for (const course of currentCourses) {
        if (!course.meetings || course.meetings.length === 0) continue;
        
        for (const meeting of course.meetings) {
            const fullDay = dayMap[meeting.day];
            if (!fullDay) continue;
            
            const startFloat = timeToFloat(meeting.startTime);
            const endFloat = timeToFloat(meeting.endTime);
            const startHour = Math.floor(startFloat);
            const startSlotIndex = startHour;
            const durationHours = endFloat - startFloat;
            const endHour = Math.ceil(endFloat);
            const rowspan = Math.max(1, endHour - startHour);
            
            if (startSlotIndex < 0 || startSlotIndex >= times.length) continue;
            
            const startMinutesPastHour = (startFloat - startHour) * 60;
            const topOffset = (startMinutesPastHour / 60) * 70;
            const heightPx = Math.max(30, durationHours * 70);
            
            if (!grid[fullDay][startSlotIndex]) {
                grid[fullDay][startSlotIndex] = {
                    course: course,
                    meeting: meeting,
                    duration: rowspan,
                    topOffset: topOffset,
                    heightPx: heightPx,
                    startIdx: startSlotIndex,
                    endIdx: startSlotIndex + rowspan
                };
            }
        }
    }
    
    let html = '<div class="timetable-wrapper">';
    html += '<table class="timetable">';
    html += '<thead><tr><th class="time-col">Time</th>';
    for (const day of days) {
        html += `<th>${day}</th>`;
    }
    html += '</thead><tbody>';
    
    for (let slotIdx = 0; slotIdx < times.length; slotIdx++) {
        const hour = slotIdx;
        const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        const period = hour >= 12 ? 'PM' : 'AM';
        const timeLabel = `${displayHour}:00 ${period}`;
        
        html += `<tr class="time-row" data-slot="${slotIdx}" style="height: 70px;">`;
        html += `<td class="time-slot"><strong>${timeLabel}</strong></td>`;
        
        for (const day of days) {
            const cell = grid[day][slotIdx];
            
            let isSpanned = false;
            for (let prevSlot = 0; prevSlot < slotIdx; prevSlot++) {
                const prevCell = grid[day][prevSlot];
                if (prevCell && prevCell.duration > 0) {
                    if (slotIdx > prevCell.startIdx && slotIdx < prevCell.startIdx + prevCell.duration) {
                        isSpanned = true;
                        break;
                    }
                }
            }
            
            if (isSpanned) {
                html += `<td class="spanned-cell" style="display: none;"></td>`;
            } else if (cell && cell.course) {
                const rowspan = cell.duration;
                html += `<td class="course-cell-wrapper" rowspan="${rowspan}" style="position: relative; vertical-align: top;">`;
                html += `
                    <div class="course-cell" onclick="editCourse('${escapeHtml(cell.course.code)}')" 
                        style="position: absolute; top: ${cell.topOffset}px; left: 4px; right: 4px; height: ${cell.heightPx}px; min-height: 30px;">
                        <div class="course-code">${escapeHtml(cell.course.code)}</div>
                        <div class="course-subject">${escapeHtml((cell.course.subject || '').substring(0, 35))}</div>
                        <div class="course-time">${escapeHtml(cell.meeting.startTime)} - ${escapeHtml(cell.meeting.endTime)}</div>
                        <div class="course-room">${escapeHtml(cell.meeting.room || 'Online Class')}</div>
                        ${cell.course.faculty ? `<div class="course-faculty">${escapeHtml(cell.course.faculty.substring(0, 30))}</div>` : ''}
                    </div>
                `;
                html += `</td>`;
            } else {
                html += `<td class="empty-cell" style="height: 70px;">`;
                html += `</td>`;
            }
        }
        html += `</tr>`;
    }
    
    html += `</tbody>`;
    html += `<td>`;
    html += `</div>`;
    
    document.getElementById('timetableGrid').innerHTML = html;
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

function editCourse(courseCode) {
    const course = currentCourses.find(c => c.code === courseCode);
    if (!course) return;
    
    currentEditingCourse = course;
    
    // For simplicity, show first meeting's data in modal
    const firstMeeting = course.meetings[0] || {};
    
    document.getElementById('editCode').value = course.code;
    document.getElementById('editSubject').value = course.subject || '';
    document.getElementById('editDay').value = firstMeeting.day || '';
    document.getElementById('editStartTime').value = firstMeeting.startTime || '';
    document.getElementById('editEndTime').value = firstMeeting.endTime || '';
    document.getElementById('editRoom').value = firstMeeting.room || '';
    document.getElementById('editFaculty').value = course.faculty || '';
    
    document.getElementById('editModal').style.display = 'block';
}

function saveCourseEdits() {
    if (!currentEditingCourse) return;
    
    // Update course basic info
    currentEditingCourse.code = document.getElementById('editCode').value.trim();
    currentEditingCourse.subject = document.getElementById('editSubject').value.trim();
    currentEditingCourse.faculty = document.getElementById('editFaculty').value.trim();
    
    // Update ALL meetings with new values
    const newDay = document.getElementById('editDay').value;
    const newStartTime = document.getElementById('editStartTime').value;
    const newEndTime = document.getElementById('editEndTime').value;
    const newRoom = document.getElementById('editRoom').value.trim();
    
    // Expand multi-day codes
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
    
    renderTimetableGrid();
    showStatus('✅ Schedule updated successfully!', 'success');
    closeModal();
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingCourse = null;
}

function resetToOriginal() {
    if (originalCourses.length) {
        currentCourses = JSON.parse(JSON.stringify(originalCourses));
        renderTimetableGrid();
        showStatus('✅ Reset to original schedule.', 'success');
    }
}

// ========== LOCKSREEN WALLPAPER GENERATOR ==========
async function generateLockscreen() {
    if (currentCourses.length === 0) {
        showStatus('Please upload a COR first.', 'error');
        return;
    }
    
    showLoading(true);
    
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
    
    // Only include days that have classes
    const daysWithClasses = daysOrder.filter(day => scheduleByDay[day].length > 0);
    
    if (daysWithClasses.length === 0) {
        showStatus('No classes found in schedule.', 'error');
        showLoading(false);
        return;
    }
    
    // Build lockscreen HTML
    let html = `<div class="lockscreen-wallpaper" id="lockscreenWallpaper">`;
    html += `<div class="lockscreen-title">`;
    html += `<h1>Class Schedule</h1>`;
    html += `</div>`;
    html += `<div class="lockscreen-schedule">`;
    
    for (const day of daysWithClasses) {
        const classes = scheduleByDay[day];
        const shortDay = fullDayMap[day];
        
        html += `<div class="day-card">`;
        html += `<div class="day-header">`;
        html += `<span class="day-name">${shortDay}</span>`;
        html += `</div>`;
        html += `<div class="class-list">`;
        
        for (const cls of classes) {
            const timeRange = `${cls.startTime} – ${cls.endTime}`;
            html += `
                <div class="class-item">
                    <div class="class-time">${escapeHtml(timeRange)}</div>
                    <div class="class-name">${escapeHtml(cls.name.substring(0, 40))}</div>
                    <div class="class-room">${escapeHtml(cls.room || '')}</div>
                </div>
            `;
        }
        html += `</div></div>`;
    }
    
    html += `</div>`;
    html += `</div>`;
    
    // Store original and show lockscreen
    const gridContainer = document.getElementById('timetableGrid');
    const originalContent = gridContainer.innerHTML;
    gridContainer.innerHTML = html;
    
    setTimeout(async () => {
        const element = document.getElementById('lockscreenWallpaper');
        
        if (typeof html2canvas === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }
        
        try {
            const canvas = await html2canvas(element, {
                scale: 2.5,
                backgroundColor: '#faf7f0',
                logging: false
            });
            
            const link = document.createElement('a');
            link.download = 'lockscreen_schedule.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            showStatus('✅ Lockscreen wallpaper saved!', 'success');
        } catch (error) {
            console.error('Error:', error);
            showStatus('Error generating image', 'error');
        } finally {
            gridContainer.innerHTML = originalContent;
            showLoading(false);
        }
    }, 200);
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