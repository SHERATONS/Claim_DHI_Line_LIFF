import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: '#f8f9fa'
        }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: '#dc3545' }}>404</h1>
            <h2 style={{ marginBottom: '1.5rem', color: '#343a40' }}>ไม่พบหน้าที่คุณต้องการ</h2>
            <p style={{ marginBottom: '2rem', color: '#6c757d' }}>
                หน้าที่คุณกำลังมองหาอาจถูกย้าย หรือไม่มีอยู่ในระบบ
            </p>
            <button
                onClick={() => navigate('/')}
                style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    color: '#fff',
                    backgroundColor: '#007bff',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            >
                กลับสู่หน้าหลัก
            </button>
        </div>
    );
};

export default NotFound;
