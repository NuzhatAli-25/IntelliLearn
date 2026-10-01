import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import './InstructorDashboard.css';

const InstructorDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [enrollments, setEnrollments] = useState(0);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Filter courses based on search term
    if (searchTerm) {
      const filtered = courses.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses(courses);
    }
  }, [searchTerm, courses]);

  const fetchDashboardData = async () => {
    try {
      // Fetch instructor courses
      const coursesRes = await axios.get('/api/courses');
      const instructorCourses = coursesRes.data.data.filter(course => course.instructor._id === user._id);
      
      // Calculate total enrollments
      const totalEnrollments = instructorCourses.reduce((sum, course) => 
        sum + (course.studentsEnrolled?.length || 0), 0);
      
      // Fetch recent submissions for instructor's courses
      const submissionPromises = instructorCourses.map(course => 
        axios.get(`/api/submissions/course/${course._id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
      );
      
      const submissionResults = await Promise.all(submissionPromises);
      const allSubmissions = submissionResults.flatMap(result => result.data.data);
      const recentSubmissions = allSubmissions.slice(0, 5); // Last 5 submissions
      
      setCourses(instructorCourses);
      setFilteredCourses(instructorCourses);
      setEnrollments(totalEnrollments);
      setSubmissions(recentSubmissions);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="instructor-dashboard">Loading dashboard...</div>;
  }

  return (
    <div className="instructor-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Instructor Dashboard</h1>
          <p>Welcome back, {user?.name}</p>
        </div>
        <div>
          <Link to="/instructor/create-course" className="btn btn-primary">
            Create New Course
          </Link>
        </div>
      </div>
      
      <div className="welcome-banner">
        <h2>Teach and Inspire</h2>
        <p>Manage your courses, grade submissions, and track student progress.</p>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-value">{courses.length}</div>
          <div className="stat-label">Your Courses</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{enrollments}</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-value">{submissions.length}</div>
          <div className="stat-label">Pending Submissions</div>
        </div>
      </div>
      
      <div className="dashboard-search">
        <input
          type="text"
          placeholder="Search your courses..."
          className="search-bar"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="dashboard-content">
        <div className="courses-section">
          <div className="section-header">
            <h2>Your Courses</h2>
            <Link to="/instructor/courses" className="btn btn-outline">
              View All Courses
            </Link>
          </div>
          
          {filteredCourses.length > 0 ? (
            <div className="courses-grid">
              {filteredCourses.slice(0, 3).map((course) => (
                <div key={course._id} className="course-card">
                  <img 
                    src={course.thumbnail || 'https://via.placeholder.com/300x200/4361ee/ffffff?text=Course+Image'} 
                    alt={course.title} 
                    className="course-image"
                  />
                  <div className="course-info">
                    <h3>{course.title}</h3>
                    <p className="course-description">{course.description.substring(0, 80)}...</p>
                    
                    <div className="course-meta">
                      <span className="students-count">
                        👥 {course.studentsEnrolled?.length || 0} students
                      </span>
                      <span className={`status ${course.isPublished ? 'published' : 'draft'}`}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    
                    <div className="course-actions">
                      <Link to={`/instructor/edit-course/${course._id}`} className="btn btn-small btn-edit">
                        Edit
                      </Link>
                      <Link to={`/instructor/grade/${course._id}`} className="btn btn-small btn-grade">
                        Grade Submissions
                      </Link>
                      <Link to={`/instructor/mark-attendance/${course._id}`} className="btn btn-small btn-attendance">
                        Attendance
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-courses">
              <h3>No Courses Found</h3>
              <p>We couldn't find any courses matching your search. Try adjusting your search term.</p>
              <button className="btn" onClick={() => setSearchTerm('')}>
                Clear Search
              </button>
            </div>
          )}
        </div>
        
        {submissions.length > 0 && (
          <div className="submissions-section">
            <h2>Recent Submissions</h2>
            <div className="submissions-list">
              {submissions.map((submission) => (
                <div key={submission._id} className="submission-item">
                  <div className="submission-info">
                    <h4>{submission.assignmentTitle}</h4>
                    <p>From {submission.student?.name} • {new Date(submission.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="submission-actions">
                    <Link to={`/instructor/grade/${submission.course._id}`} className="btn btn-small btn-grade">
                      Grade Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorDashboard;