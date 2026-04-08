const Attendance = require('../models/Attendance');
const Lecture = require('../models/Lecture');
const User = require('../models/User');
const PDFDocument = require('pdfkit');

// Start attendance session
exports.startAttendance = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await Lecture.findById(lectureId)
      .populate('classroom')
      .populate('teacher', 'name');

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // Check if user is the teacher of this lecture
    if (lecture.teacher._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      message: 'Attendance session started',
      lecture: {
        id: lecture._id,
        subject: lecture.subject,
        classroom: lecture.classroom.name,
        totalEnrolled: lecture.students.length,
        attendancePassword: lecture.attendancePassword
      }
    });
  } catch (error) {
    console.error('Start attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark attendance via face recognition
exports.markAttendance = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { faceDescriptor, password } = req.body;

    console.log('=== MARK ATTENDANCE REQUEST ===');
    console.log('Lecture ID:', lectureId);
    console.log('Password provided:', password ? 'Yes' : 'No');
    console.log('Face descriptor length:', faceDescriptor ? faceDescriptor.length : 'None');

    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ error: 'Invalid face descriptor' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Attendance password is required' });
    }

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    console.log('Lecture password:', lecture.attendancePassword);
    console.log('Provided password:', password.toUpperCase());

    // Validate password
    if (lecture.attendancePassword !== password.toUpperCase()) {
      console.log('❌ Password mismatch!');
      return res.status(403).json({ 
        error: 'Invalid attendance password',
        message: 'The password you entered is incorrect. Please check with your teacher.'
      });
    }

    console.log('✅ Password correct');

    // Check if lecture is active (within time range)
    const now = new Date();
    const lectureStart = new Date(lecture.startTime);
    const lectureEnd = new Date(lecture.endTime);

    const allowedStart = new Date(lectureStart.getTime() - 10 * 60000);
    const allowedEnd = new Date(lectureEnd.getTime() + 10 * 60000);

    if (now < allowedStart || now > allowedEnd) {
      return res.status(403).json({ 
        error: 'Attendance closed',
        message: 'You can only mark attendance during the lecture time (10 minutes before to 10 minutes after).'
      });
    }

    // Get all enrolled students with face descriptors
    const enrolledStudents = await User.find({
      _id: { $in: lecture.students },
      faceDescriptor: { $exists: true, $ne: [] }
    });

    console.log('Total enrolled students:', lecture.students.length);
    console.log('Students with face data:', enrolledStudents.length);

    if (enrolledStudents.length === 0) {
      return res.status(404).json({ 
        error: 'No students with face data enrolled',
        message: 'No registered faces found for this lecture.'
      });
    }

    // Find best match
    let bestMatch = null;
    let bestDistance = Infinity;
    const MATCH_THRESHOLD = 0.8; // Increased threshold

    console.log('\n=== FACE MATCHING ===');
    for (const student of enrolledStudents) {
      try {
        const distance = euclideanDistance(faceDescriptor, student.faceDescriptor);
        console.log(`Student ${student.name} (${student.rollNumber}): distance = ${distance.toFixed(4)}`);
        
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = student;
        }
      } catch (error) {
        console.error(`Error comparing with ${student.name}:`, error.message);
      }
    }

    console.log('\n=== MATCH RESULT ===');
    console.log('Best match:', bestMatch ? bestMatch.name : 'None');
    console.log('Best distance:', bestDistance.toFixed(4));
    console.log('Threshold:', MATCH_THRESHOLD);
    console.log('Match accepted:', bestDistance < MATCH_THRESHOLD ? 'Yes' : 'No');

    if (!bestMatch || bestDistance >= MATCH_THRESHOLD) {
      return res.status(404).json({ 
        error: 'No matching face found',
        message: 'Face not recognized. Please try again or contact your teacher.',
        debug: {
          bestDistance: bestDistance.toFixed(4),
          threshold: MATCH_THRESHOLD,
          studentsChecked: enrolledStudents.length
        }
      });
    }

    // Verify that the matched student is the one making the request (for students)
    if (req.user.role === 'student' && bestMatch._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'Unauthorized',
        message: 'You cannot mark attendance for another student'
      });
    }

    // Check if already marked
    const existing = await Attendance.findOne({
      lecture: lectureId,
      student: bestMatch._id
    });

    if (existing) {
      return res.status(400).json({ 
        error: 'Already marked',
        student: {
          name: bestMatch.name,
          rollNumber: bestMatch.rollNumber,
          markedAt: existing.markedAt
        }
      });
    }

    // Mark attendance
    const attendance = new Attendance({
      lecture: lectureId,
      student: bestMatch._id,
      markedBy: 'face_recognition',
      confidence: 1 - bestDistance
    });

    await attendance.save();

    console.log('✅ Attendance marked successfully!');

    res.json({
      message: 'Attendance marked successfully',
      student: {
        name: bestMatch.name,
        rollNumber: bestMatch.rollNumber,
        department: bestMatch.department,
        year: bestMatch.year
      },
      confidence: (1 - bestDistance).toFixed(2),
      distance: bestDistance.toFixed(4)
    });

  } catch (error) {
    console.error('❌ Mark attendance error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
};

function euclideanDistance(desc1, desc2) {
  if (!desc1 || !desc2) {
    throw new Error('Invalid descriptors');
  }

  if (desc1.length !== desc2.length) {
    throw new Error(`Descriptor length mismatch: ${desc1.length} vs ${desc2.length}`);
  }

  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

// Get attendance for a lecture
exports.getAttendance = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await Lecture.findById(lectureId)
      .populate('students', 'name rollNumber department year')
      .populate('classroom', 'name roomNumber');

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    const attendance = await Attendance.find({ lecture: lectureId })
      .populate('student', 'name rollNumber department year email');

    const present = attendance.map(a => ({
      student: a.student,
      markedAt: a.markedAt,
      confidence: a.confidence
    }));

    const presentIds = attendance.map(a => a.student._id.toString());
    const absent = lecture.students.filter(
      s => !presentIds.includes(s._id.toString())
    );

    res.json({
      lecture: {
        subject: lecture.subject,
        classroom: lecture.classroom,
        startTime: lecture.startTime,
        duration: lecture.duration
      },
      stats: {
        totalEnrolled: lecture.students.length,
        present: present.length,
        absent: absent.length,
        percentage: ((present.length / lecture.students.length) * 100).toFixed(2)
      },
      present,
      absent
    });

  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Generate PDF report
exports.downloadAttendancePDF = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await Lecture.findById(lectureId)
      .populate('students', 'name rollNumber department year')
      .populate('classroom', 'name roomNumber')
      .populate('teacher', 'name');

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    const attendance = await Attendance.find({ lecture: lectureId })
      .populate('student', 'name rollNumber department year')
      .sort({ markedAt: 1 });

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${lectureId}.pdf`);

    doc.pipe(res);

    // --- DATE FORMATTING HELPER ---
    const formatDate = (date) => {
      const d = new Date(date);
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    };

    const formatTime = (date) => {
      return new Date(date).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata' // Forces IST
      });
    };

    // Title
    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown();

    // Lecture Details
    doc.fontSize(12);
    doc.text(`Subject: ${lecture.subject}`);
    doc.text(`Classroom: ${lecture.classroom.name} (${lecture.classroom.roomNumber})`);
    doc.text(`Teacher: ${lecture.teacher.name}`);
    doc.text(`Date: ${formatDate(lecture.startTime)}`); // Now in DD-MM-YYYY
    doc.text(`Lecture Start Time: ${formatTime(lecture.startTime)}`); // Now in IST
    doc.text(`Duration: ${lecture.duration} minutes`);
    doc.moveDown();

    // Statistics
    const presentCount = attendance.length;
    const totalCount = lecture.students.length;
    const percentage = ((presentCount / totalCount) * 100).toFixed(2);

    doc.fontSize(14).text('Statistics:', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Enrolled: ${totalCount}`);
    doc.text(`Present: ${presentCount}`);
    doc.text(`Absent: ${totalCount - presentCount}`);
    doc.text(`Attendance: ${percentage}%`);
    doc.moveDown();

    // Present Students Table
    doc.fontSize(14).text('Present Students:', { underline: true });
    doc.moveDown(0.5);

    // Table header
    doc.fontSize(10);
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 100;
    const col3 = 250;
    const col4 = 400;

    doc.text('S.No', col1, tableTop);
    doc.text('Roll No', col2, tableTop);
    doc.text('Name', col3, tableTop);
    doc.text('Time', col4, tableTop);
    doc.moveDown();

    // Table rows
    attendance.forEach((record, index) => {
      const y = doc.y;
      doc.text(index + 1, col1, y);
      doc.text(record.student.rollNumber, col2, y);
      doc.text(record.student.name, col3, y);
      doc.text(formatTime(record.markedAt), col4, y); // Student mark time in IST
      doc.moveDown(0.5);
    });

    doc.moveDown();

    // Absent Students
    const presentIds = attendance.map(a => a.student._id.toString());
    const absentStudents = lecture.students.filter(
      s => !presentIds.includes(s._id.toString())
    );

    if (absentStudents.length > 0) {
      doc.fontSize(14).text('Absent Students:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);

      absentStudents.forEach((student, index) => {
        const y = doc.y;
        doc.text(index + 1, col1, y);
        doc.text(student.rollNumber, col2, y);
        doc.text(student.name, col3, y);
        doc.moveDown(0.5);
      });
    }

    // Footer
    doc.fontSize(8).text(
      `Generated on: ${formatDate(new Date())} at ${formatTime(new Date())}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();

  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Helper function: Calculate Euclidean distance between two face descriptors
function euclideanDistance(desc1, desc2) {
  if (!desc1 || !desc2) {
    throw new Error('Invalid descriptors');
  }

  if (desc1.length !== desc2.length) {
    throw new Error(`Descriptor length mismatch: ${desc1.length} vs ${desc2.length}`);
  }

  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

module.exports = exports;