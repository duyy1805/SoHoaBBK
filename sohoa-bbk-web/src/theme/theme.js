import { createTheme, alpha } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#6366f1',
            light: '#818cf8',
            dark: '#4f46e5',
            contrastText: '#ffffff'
        },
        secondary: {
            main: '#8b5cf6',
            light: '#a78bfa',
            dark: '#7c3aed'
        },
        success: {
            main: '#22c55e',
            light: '#86efac',
            dark: '#16a34a'
        },
        error: {
            main: '#ef4444',
            light: '#fca5a5',
            dark: '#dc2626'
        },
        warning: {
            main: '#f59e0b',
            light: '#fcd34d',
            dark: '#d97706'
        },
        background: {
            default: '#f8fafc',
            paper: '#ffffff'
        },
        text: {
            primary: '#1e293b',
            secondary: '#64748b'
        }
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 700 },
        h4: { fontWeight: 700 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: {
            textTransform: 'none',
            fontWeight: 600
        }
    },
    shape: {
        borderRadius: 12
    },
    shadows: [
        'none',
        '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        ...Array(18).fill('0 25px 50px -12px rgba(0, 0, 0, 0.25)')
    ],
    components: {
        MuiButton: {
            defaultProps: {
                disableElevation: true
            },
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    padding: '10px 20px',
                    fontWeight: 600
                },
                contained: {
                    boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.25)',
                    '&:hover': {
                        boxShadow: '0 6px 20px 0 rgba(99, 102, 241, 0.35)'
                    }
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none'
                }
            }
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 10
                    }
                }
            }
        },
        // 🔥 CẬP NHẬT: Ép Chip nhỏ lại trên toàn hệ thống
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    height: 24
                }
            }
        },
        // 🔥 THÊM MỚI: Cấu hình mặc định cho Table là size="small"
        MuiTable: {
            defaultProps: {
                size: 'small', // Mặc định mọi bảng đều là bản nhỏ
            }
        },
        // 🔥 CẬP NHẬT: Ép font chữ và padding cho từng ô trong bảng
        MuiTableCell: {
            styleOverrides: {
                root: {
                    fontSize: '0.85rem', // Chữ nhỏ gọn
                    padding: '8px 16px', // Giảm khoảng cách trên dưới
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: '#f8fafc',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    lineHeight: 1.2
                }
            }
        },
        // 🔥 THÊM MỚI: Cấu hình lại thanh phân trang cho mỏng gọn
        MuiTablePagination: {
            styleOverrides: {
                toolbar: {
                    minHeight: '40px', // Ép chiều cao thanh phân trang
                },
                selectLabel: {
                    fontSize: '0.85rem',
                },
                displayedRows: {
                    fontSize: '0.85rem',
                }
            }
        },
        MuiAccordion: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    '&:before': {
                        display: 'none'
                    }
                }
            }
        }
    }
});

export default theme;