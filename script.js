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
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const textItems = textContent.items.map(item => item.str);
    
    // Join all text for easier searching
    const fullText = textItems.join(' ');
    
    // ========== EXTRACT STUDENT INFO ==========
    currentStudent = {};
    
    const nameRegex = /Name:\s*([A-Z][A-Za-z\s,]+?)(?=\s+(?:Student No|Program|Gender|College|$))/i;
    const studentNoRegex = /Student No:\s*(\d+)/i;
    const programRegex = /Program:\s*([A-Z][A-Za-z\s.]+?)(?=\s+(?:Gender|Major|Curriculum|Year Level|$))/i;
    
    const nameMatch = fullText.match(nameRegex);
    const studentNoMatch = fullText.match(studentNoRegex);
    const programMatch = fullText.match(programRegex);
    
    if (nameMatch) currentStudent.name = nameMatch[1].trim();
    if (studentNoMatch) currentStudent.studentNo = studentNoMatch[1];
    if (programMatch) currentStudent.program = programMatch[1].trim();
    
    console.log('✅ Extracted student info:', currentStudent);
    
    // ========== EXTRACT COURSES ==========
    const courses = [];
    
    let i = 0;
    while (i < textItems.length) {
        const item = textItems[i].trim();
        
        if (!item || item.length < 2) {
            i++;
            continue;
        }
        
        const isFalsePositive = (
            item === 'CODE' || item === 'SUBJECT' || item === 'TITLE' ||
            item === 'UNITS' || item === 'SECTION' || item === 'SCHEDULE' ||
            item === 'ROOM' || item === 'FACULTY' || item === 'Total' ||
            item === 'Lec' || item === 'Lab' || item === 'Credit' ||
            item === 'Gender:' || item === 'Major:' || item === 'Student No:' ||
            item.match(/^Fee$|^FEE$|^Amount$|^DISCOUNT$|^TOTAL$|^PAYMENT$|^Prelim$|^Midterm$|^Prefinal$|^Final$/) ||
            item.match(/^\d+\.\d{2}$/)
        );
        
        if (isFalsePositive) {
            i++;
            continue;
        }
        
        const isCourseCode = (
            /^[A-Z]{2,6}\s?\d{1,4}$/i.test(item) ||
            /^[A-Z]{2,8}$/i.test(item)
        );
        
        if (isCourseCode && item.length < 15 && !item.match(/^(Name|Program|Student|Gender|Major|College)/i)) {
            let schedule = '';
            let scheduleIndex = i;
            let subject = '';
            let section = '';
            let faculty = '';
            
            if (textItems[i+1] && !textItems[i+1].match(/^\d/) && textItems[i+1].length > 2) {
                subject = textItems[i+1];
                if (textItems[i+2] && !textItems[i+2].match(/^\d/) && textItems[i+2].length > 2 && textItems[i+2].length < 30) {
                    subject += ' ' + textItems[i+2];
                }
            }
            
            for (let j = i+2; j < Math.min(i+10, textItems.length); j++) {
                const potential = textItems[j] || '';
                if (potential.match(/^[A-Z]{2,4}\d+R\d+$/i) || potential.match(/^[A-Z]{3,10}_[A-Z]{2,4}_\d+[A-Z]?$/i)) {
                    section = potential;
                    break;
                }
            }
            
            for (let j = i+2; j < Math.min(i+15, textItems.length); j++) {
                const potential = textItems[j] || '';
                if (potential.match(/(M|T|W|Th|F|S|TF|MTh|MWF|TTh)\s+\d{1,2}:\d{2}\s*[AP]M/)) {
                    schedule = potential;
                    scheduleIndex = j;
                    break;
                }
            }
            
            if (!schedule && item.match(/(M|T|W|Th|F|S|TF|MTh|MWF|TTh)\s+\d{1,2}:\d{2}\s*[AP]M/)) {
                schedule = item;
                scheduleIndex = i;
                const schedulePart = item.replace(/^[A-Z]{2,6}\s?\d{1,4}/i, '').trim();
                if (schedulePart && !subject) {
                    subject = schedulePart;
                }
            }
            
            if (scheduleIndex + 1 < textItems.length && textItems[scheduleIndex + 1]) {
                faculty = textItems[scheduleIndex + 1];
                if (textItems[scheduleIndex + 2] && textItems[scheduleIndex + 2].match(/^[A-Z]/) && textItems[scheduleIndex + 2].length > 3) {
                    faculty += ' ' + textItems[scheduleIndex + 2];
                }
            }
            
            const dayMatch = schedule.match(/^(M|T|W|Th|F|TF|MTh|MWF|TTh)/i);
            const timeMatch = schedule.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
            
            let room = '';
            const roomMatch = schedule.match(/\(([^)]+)\)/);
            if (roomMatch) {
                room = roomMatch[1];
            } else {
                const simpleRoom = schedule.match(/\d{2,3}-\d{3,4}/);
                if (simpleRoom) room = simpleRoom[0];
                const modularRoom = schedule.match(/Modular Classroom\s*\d+/i);
                if (modularRoom) room = modularRoom[0];
                const labRoom = schedule.match(/CITC\s*Lab\s*\d+/i);
                if (labRoom) room = labRoom[0];
                const ciscoRoom = schedule.match(/Cisco\s*Lab\s*\d+/i);
                if (ciscoRoom) room = ciscoRoom[0];
            }
            
            if (dayMatch && timeMatch) {
                courses.push({
                    code: item.replace(/\s/g, ''),
                    subject: subject.substring(0, 50),
                    section: section,
                    day: dayMatch[1],
                    startTime: timeMatch[1],
                    endTime: timeMatch[2],
                    room: room,
                    faculty: faculty.substring(0, 60),
                    rawSchedule: schedule
                });
            }
            
            i = scheduleIndex + 2;
        } else {
            i++;
        }
    }
    
    console.log('📚 Found courses:', courses.length);
    return courses;
}

function renderTimetableGrid() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
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
    
    for (const course of currentCourses) {
        if (!course.startTime || !course.day) continue;
        
        const courseDays = getDaysArray(course.day);
        const startFloat = timeToFloat(course.startTime);
        const endFloat = timeToFloat(course.endTime);
        const startHour = Math.floor(startFloat);
        const startSlotIndex = startHour;
        const durationHours = endFloat - startFloat;
        const endHour = Math.ceil(endFloat);
        const rowspan = Math.max(1, endHour - startHour);
        
        if (startSlotIndex < 0 || startSlotIndex >= times.length) continue;
        
        const startMinutesPastHour = (startFloat - startHour) * 60;
        const topOffset = (startMinutesPastHour / 60) * 70;
        const heightPx = Math.max(30, durationHours * 70);
        
        for (const day of courseDays) {
            if (!grid[day][startSlotIndex]) {
                grid[day][startSlotIndex] = {
                    course: course,
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
                        <div class="course-time">${escapeHtml(cell.course.startTime)} - ${escapeHtml(cell.course.endTime)}</div>
                        <div class="course-room">${escapeHtml(cell.course.room || 'TBA')}</div>
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
    html += `</table>`;
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
        'M': ['Monday'],
        'T': ['Tuesday'],
        'W': ['Wednesday'],
        'Th': ['Thursday'],
        'F': ['Friday'],
        'S': ['Saturday'],
        'TF': ['Tuesday', 'Thursday'],
        'TTh': ['Tuesday', 'Thursday'],
        'MTh': ['Monday', 'Thursday'],
        'MW': ['Monday', 'Wednesday'],
        'MWF': ['Monday', 'Wednesday', 'Friday']
    };
    return map[dayCode] || [dayCode];
}

function editCourse(courseCode) {
    const course = currentCourses.find(c => c.code === courseCode);
    if (!course) return;
    
    currentEditingCourse = course;
    
    document.getElementById('editCode').value = course.code;
    document.getElementById('editSubject').value = course.subject || '';
    document.getElementById('editDay').value = course.day;
    document.getElementById('editStartTime').value = course.startTime;
    document.getElementById('editEndTime').value = course.endTime;
    document.getElementById('editRoom').value = course.room || '';
    
    document.getElementById('editModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingCourse = null;
}

function saveCourseEdits() {
    if (!currentEditingCourse) return;
    
    currentEditingCourse.code = document.getElementById('editCode').value.trim();
    currentEditingCourse.subject = document.getElementById('editSubject').value.trim();
    currentEditingCourse.day = document.getElementById('editDay').value;
    currentEditingCourse.startTime = document.getElementById('editStartTime').value;
    currentEditingCourse.endTime = document.getElementById('editEndTime').value;
    currentEditingCourse.room = document.getElementById('editRoom').value.trim();
    
    renderTimetableGrid();
    showStatus('✅ Schedule updated successfully!', 'success');
    closeModal();
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
    
    // Group courses by day
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const scheduleByDay = {};
    daysOrder.forEach(day => { scheduleByDay[day] = []; });
    
    for (const course of currentCourses) {
        if (!course.startTime || !course.day) continue;
        const days = getDaysArray(course.day);
        for (const day of days) {
            scheduleByDay[day].push({
                code: course.code,
                name: course.subject || course.code,
                startTime: course.startTime,
                endTime: course.endTime,
                room: course.room
            });
        }
    }
    
    // Sort classes by time
    for (const day in scheduleByDay) {
        scheduleByDay[day].sort((a, b) => timeToFloat(a.startTime) - timeToFloat(b.startTime));
    }
    
    // ONLY include days that have classes
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
        const dayClass = 'day-card';
        const shortDay = day.substring(0, 3).toUpperCase();
        
        html += `<div class="${dayClass}">`;
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
    html += `</div>`; // No footer
    
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
            // Get natural dimensions without stretching
            const rect = element.getBoundingClientRect();
            
            // Create canvas at natural scale
            const canvas = await html2canvas(element, {
                scale: 2.5,
                backgroundColor: '#faf7f0',
                logging: false,
                windowWidth: rect.width,
                windowHeight: rect.height,
                onclone: (clonedDoc, element) => {
                    // Ensure cloned element has correct styling
                }
            });
            
            // Don't force 1080x1920 - keep natural proportions
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