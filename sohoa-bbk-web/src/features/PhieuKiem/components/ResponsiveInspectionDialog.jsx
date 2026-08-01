import { Dialog, useMediaQuery, useTheme } from "@mui/material";

export default function ResponsiveInspectionDialog({ children, paperSx, ...props }) {
    const theme = useTheme();
    const isPhone = useMediaQuery(theme.breakpoints.down("sm"));

    return (
        <Dialog
            fullScreen={isPhone}
            fullWidth
            maxWidth="md"
            scroll="paper"
            {...props}
            PaperProps={{
                ...props.PaperProps,
                sx: {
                    maxHeight: isPhone ? "100dvh" : "calc(100dvh - 48px)",
                    m: isPhone ? 0 : undefined,
                    ...paperSx,
                    ...props.PaperProps?.sx
                }
            }}
        >
            {children}
        </Dialog>
    );
}
