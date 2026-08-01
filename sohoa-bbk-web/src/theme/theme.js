import { createTheme } from '@mui/material/styles';

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
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
        fontSize: 13,
        h1: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.2 },
        h2: { fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.22 },
        h3: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.25 },
        h4: { fontWeight: 700, fontSize: '1.375rem', lineHeight: 1.28 },
        h5: { fontWeight: 700, fontSize: '1.2rem', lineHeight: 1.3 },
        h6: { fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.35 },
        subtitle1: { fontSize: '0.9rem', lineHeight: 1.45 },
        subtitle2: { fontSize: '0.82rem', lineHeight: 1.4 },
        body1: { fontSize: '0.875rem', lineHeight: 1.5 },
        body2: { fontSize: '0.8rem', lineHeight: 1.45 },
        caption: { fontSize: '0.72rem', lineHeight: 1.4 },
        button: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8rem',
            lineHeight: 1.35
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
                disableElevation: true,
                size: 'small'
            },
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    minHeight: 34,
                    padding: '7px 14px',
                    fontWeight: 600,
                    '@media (max-width:599.95px)': {
                        minHeight: 44
                    }
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
                    borderRadius: 12,
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
            defaultProps: {
                size: 'small'
            },
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8
                    }
                }
            }
        },
        MuiInputBase: {
            styleOverrides: {
                root: {
                    fontSize: '0.84rem',
                    '@media (max-width:599.95px)': {
                        fontSize: '16px'
                    }
                },
                input: {
                    paddingTop: 9,
                    paddingBottom: 9
                }
            }
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    fontSize: '0.82rem'
                }
            }
        },
        MuiFormLabel: {
            styleOverrides: {
                root: {
                    fontSize: '0.82rem'
                }
            }
        },
        MuiFormHelperText: {
            styleOverrides: {
                root: {
                    fontSize: '0.7rem',
                    marginTop: 3
                }
            }
        },
        // 🔥 CẬP NHẬT: Ép Chip nhỏ lại trên toàn hệ thống
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    height: 23
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
                    fontSize: '0.78rem',
                    padding: '7px 12px',
                },
                head: {
                    fontWeight: 700,
                    backgroundColor: '#f8fafc',
                    paddingTop: '9px',
                    paddingBottom: '9px',
                    lineHeight: 1.2
                }
            }
        },
        // 🔥 THÊM MỚI: Cấu hình lại thanh phân trang cho mỏng gọn
        MuiTablePagination: {
            styleOverrides: {
                toolbar: {
                    minHeight: '38px',
                },
                selectLabel: {
                    fontSize: '0.76rem',
                },
                displayedRows: {
                    fontSize: '0.76rem',
                }
            }
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    minHeight: 36,
                    fontSize: '0.82rem',
                    paddingTop: 6,
                    paddingBottom: 6
                }
            }
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    minHeight: 40
                }
            }
        },
        MuiListItemText: {
            styleOverrides: {
                primary: {
                    fontSize: '0.82rem'
                },
                secondary: {
                    fontSize: '0.72rem'
                }
            }
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    padding: 7,
                    '@media (max-width:599.95px)': {
                        minWidth: 44,
                        minHeight: 44
                    }
                }
            }
        },
        MuiToolbar: {
            styleOverrides: {
                root: {
                    minHeight: 56
                }
            }
        },
        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    padding: '14px 18px'
                }
            }
        },
        MuiDialogContent: {
            styleOverrides: {
                root: {
                    padding: '14px 18px'
                }
            }
        },
        MuiDialogActions: {
            styleOverrides: {
                root: {
                    padding: '10px 18px 14px'
                }
            }
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    minHeight: 40,
                    minWidth: 88,
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 600
                }
            }
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    minHeight: 40
                }
            }
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    padding: '7px 12px',
                    fontSize: '0.8rem'
                }
            }
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    fontSize: '0.72rem'
                }
            }
        },
        MuiAccordion: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    '&:before': {
                        display: 'none'
                    }
                }
            }
        },
        MuiAccordionSummary: {
            styleOverrides: {
                root: {
                    minHeight: 42,
                    '&.Mui-expanded': {
                        minHeight: 42
                    }
                },
                content: {
                    margin: '9px 0',
                    '&.Mui-expanded': {
                        margin: '9px 0'
                    }
                }
            }
        }
    }
});

export default theme;
