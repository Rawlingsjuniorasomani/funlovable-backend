const AttendanceService = require('../services/AttendanceService');

class AttendanceController {
    static async markAttendance(req, res) {
        try {
            const { student_id, subject_id, date, status, notes } = req.body;

            if (!student_id || !subject_id || !date || !status) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const attendance = await AttendanceService.markAttendance({
                teacher_id: req.user.id,
                student_id,
                subject_id,
                date,
                status,
                notes
            });

            res.status(201).json(attendance);
        } catch (error) {
            console.error('Mark attendance error:', error);
            res.status(500).json({ error: 'Failed to mark attendance' });
        }
    }

    static async bulkMarkAttendance(req, res) {
        try {
            const { attendance_records } = req.body;

            if (!Array.isArray(attendance_records) || attendance_records.length === 0) {
                return res.status(400).json({ error: 'Invalid attendance records' });
            }

            
            const recordsWithTeacher = attendance_records.map(record => ({
                ...record,
                teacher_id: req.user.id
            }));

            const results = await AttendanceService.bulkMarkAttendance(recordsWithTeacher);
            res.status(201).json({ message: 'Attendance marked successfully', count: results.length });
        } catch (error) {
            console.error('Bulk mark attendance error:', error);
            res.status(500).json({ error: 'Failed to mark attendance' });
        }
    }

    static async getStudentAttendance(req, res) {
        try {
            const { studentId } = req.params;
            const { subject_id, start_date, end_date } = req.query;

            const attendance = await AttendanceService.getStudentAttendance(studentId, {
                subject_id,
                start_date,
                end_date
            });

            res.json(attendance);
        } catch (error) {
            console.error('Get student attendance error:', error);
            res.status(500).json({ error: 'Failed to fetch attendance' });
        }
    }

    static async getClassAttendance(req, res) {
        try {
            const { subjectId } = req.params;
            const { date } = req.query;

            if (!date) {
                return res.status(400).json({ error: 'Date is required' });
            }

            const attendance = await AttendanceService.getClassAttendance(subjectId, date);
            res.json(attendance);
        } catch (error) {
            console.error('Get class attendance error:', error);
            res.status(500).json({ error: 'Failed to fetch class attendance' });
        }
    }

    static async getAttendanceStats(req, res) {
        try {
            const { studentId } = req.params;
            const { subject_id } = req.query;

            const stats = await AttendanceService.getAttendanceStats(studentId, subject_id);
            res.json(stats);
        } catch (error) {
            console.error('Get attendance stats error:', error);
            res.status(500).json({ error: 'Failed to fetch attendance statistics' });
        }
    }
}

module.exports = AttendanceController;
