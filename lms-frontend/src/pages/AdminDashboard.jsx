import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [enrollments, setEnrollments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState({
    totalRevenue: 0,
    activeCourses: 0,
    instructorCount: 0,
    studentCount: 0,
    adminCount: 0,
    recentUsers: 0,
    recentCourses: 0,
    totalLessons: 0
  });
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [chartData, setChartData] = useState({
    userGrowth: [],
    enrollmentTrends: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    if (userSearchTerm) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(userSearchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [userSearchTerm, users]);

  useEffect(() => {
    // Filter courses based on search term
    if (courseSearchTerm) {
      const filtered = courses.filter(course => 
        course.title.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
        (course.instructor?.name && course.instructor.name.toLowerCase().includes(courseSearchTerm.toLowerCase()))
      );
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses(courses);
    }
  }, [courseSearchTerm, courses]);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, coursesRes] = await Promise.all([
        axios.get('/api/users', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }),
        axios.get('/api/courses')
      ]);

      const allUsers = usersRes.data.data;
      const allCourses = coursesRes.data.data;
      const totalEnrollments = allCourses.reduce((sum, course) => 
        sum + (course.studentsEnrolled?.length || 0), 0);
      
      const instructorCount = allUsers.filter(user => user.role === 'instructor').length;
      const studentCount = allUsers.filter(user => user.role === 'student').length;
      const adminCount = allUsers.filter(user => user.role === 'admin').length;
      
      // Calculate revenue
      const totalRevenue = totalEnrollments * 50; // Assuming $50 average per enrollment
      
      // Calculate recent users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentUsers = allUsers.filter(user => 
        new Date(user.createdAt) > thirtyDaysAgo
      ).length;
      
      // Calculate recent courses (last 30 days)
      const recentCourses = allCourses.filter(course => 
        new Date(course.createdAt) > thirtyDaysAgo
      ).length;
      
      // Calculate total lessons
      const totalLessons = allCourses.reduce((sum, course) => 
        sum + (course.lessons?.length || 0), 0);

      setUsers(allUsers);
      setFilteredUsers(allUsers);
      setCourses(allCourses);
      setFilteredCourses(allCourses);
      setEnrollments(totalEnrollments);
      setReports({
        totalRevenue,
        activeCourses: allCourses.filter(course => course.isPublished).length,
        instructorCount,
        studentCount,
        adminCount,
        recentUsers,
        recentCourses,
        totalLessons
      });
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="admin-dashboard">Loading dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Platform overview and management</p>
        </div>
        <div>
          <Link to="/admin/reports" className="btn btn-primary">
            View Detailed Reports
          </Link>
        </div>
      </div>
      
      <div className="welcome-banner">
        <h2>Platform Management Center</h2>
        <p>Monitor platform performance, manage users and courses, and generate reports.</p>
      </div>
      
      {/* Enhanced Statistics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-value">{reports.activeCourses}/{courses.length}</div>
          <div className="stat-label">Active/Total Courses</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">${reports.totalRevenue.toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div className="stat-value">{enrollments}</div>
          <div className="stat-label">Total Enrollments</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-value">{reports.instructorCount}</div>
          <div className="stat-label">Instructors</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div className="stat-value">{reports.studentCount}</div>
          <div className="stat-label">Students</div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="additional-metrics">
        <div className="metric-card">
          <h3>Recent Activity</h3>
          <div className="metric-content">
            <div className="metric-item">
              <span className="metric-label">New Users (30d)</span>
              <span className="metric-value">{reports.recentUsers}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">New Courses (30d)</span>
              <span className="metric-value">{reports.recentCourses}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Total Lessons</span>
              <span className="metric-value">{reports.totalLessons}</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <h3>User Distribution</h3>
          <div className="distribution-chart">
            <div className="distribution-item">
              <div className="distribution-label">
                <span className="role-color student"></span>
                Students
              </div>
              <div className="distribution-bar">
                <div 
                  className="distribution-fill student" 
                  style={{ width: `${(reports.studentCount / users.length) * 100 || 0}%` }}
                ></div>
              </div>
              <span className="distribution-value">{reports.studentCount}</span>
            </div>
            <div className="distribution-item">
              <div className="distribution-label">
                <span className="role-color instructor"></span>
                Instructors
              </div>
              <div className="distribution-bar">
                <div 
                  className="distribution-fill instructor" 
                  style={{ width: `${(reports.instructorCount / users.length) * 100 || 0}%` }}
                ></div>
              </div>
              <span className="distribution-value">{reports.instructorCount}</span>
            </div>
            <div className="distribution-item">
              <div className="distribution-label">
                <span className="role-color admin"></span>
                Admins
              </div>
              <div className="distribution-bar">
                <div 
                  className="distribution-fill admin" 
                  style={{ width: `${(reports.adminCount / users.length) * 100 || 0}%` }}
                ></div>
              </div>
              <span className="distribution-value">{reports.adminCount}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="users-section">
          <div className="section-header">
            <h2>User Management</h2>
            <div className="search-container">
              <input
                type="text"
                placeholder="Search users..."
                className="search-bar"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="users-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, 5).map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/admin/users/${user._id}`} className="btn btn-small btn-view">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="courses-section">
          <div className="section-header">
            <h2>Course Management</h2>
            <div className="search-container">
              <input
                type="text"
                placeholder="Search courses..."
                className="search-bar"
                value={courseSearchTerm}
                onChange={(e) => setCourseSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="courses-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Instructor</th>
                  <th>Students</th>
                  <th>Lessons</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.slice(0, 5).map((course) => (
                  <tr key={course._id}>
                    <td>{course.title}</td>
                    <td>{course.instructor?.name}</td>
                    <td>{course.studentsEnrolled?.length || 0}</td>
                    <td>{course.lessons?.length || 0}</td>
                    <td>
                      <span className={`status-badge ${course.isPublished ? 'published' : 'draft'}`}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/courses/${course._id}`} className="btn btn-small btn-view">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/admin/reports" className="action-card">
              <div className="action-icon">📊</div>
              <h3>Generate Reports</h3>
              <p>Create detailed analytics reports</p>
            </Link>
            <Link to="/admin/users" className="action-card">
              <div className="action-icon">👥</div>
              <h3>User Management</h3>
              <p>View and manage platform users</p>
            </Link>
            <Link to="/admin/courses" className="action-card">
              <div className="action-icon">📚</div>
              <h3>Course Management</h3>
              <p>Review and manage all courses</p>
            </Link>
            <Link to="/admin/payments" className="action-card">
              <div className="action-icon">💳</div>
              <h3>Financial Reports</h3>
              <p>View payment and revenue data</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;