import {
    Box, Card, CardContent, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography
} from "@mui/material";

export default function ResponsiveDataList({ rows = [], columns = [], emptyText, getRowKey }) {
    if (rows.length === 0) {
        return (
            <Typography color="text.secondary" align="center" sx={{ py: 2, fontStyle: "italic" }}>
                {emptyText}
            </Typography>
        );
    }

    return (
        <>
            <TableContainer sx={{ display: { xs: "none", md: "block" }, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: "#f8fafc" }}>
                        <TableRow>
                            {columns.map((column) => (
                                <TableCell key={column.key} align={column.align} sx={column.headerSx}>{column.label}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={getRowKey?.(row, index) ?? row.Id ?? index} hover>
                                {columns.map((column) => (
                                    <TableCell key={column.key} align={column.align} sx={column.cellSx}>
                                        {column.render(row, index)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Stack spacing={1} sx={{ display: { xs: "flex", md: "none" } }}>
                {rows.map((row, index) => (
                    <Card key={getRowKey?.(row, index) ?? row.Id ?? index} variant="outlined" sx={{ borderRadius: 1.5 }}>
                        <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                            <Stack spacing={0.875}>
                                {columns.map((column) => (
                                    <Box key={column.key}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>{column.label}</Typography>
                                        <Box sx={{ fontSize: "0.875rem", overflowWrap: "anywhere" }}>{column.render(row, index)}</Box>
                                    </Box>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                ))}
            </Stack>
        </>
    );
}
