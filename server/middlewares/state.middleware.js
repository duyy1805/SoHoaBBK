const sql = require('mssql');
const { poolPromise } = require('../db');

const checkState = ({ table, idField, stateField, allowedStates }) => {
    return async (req, res, next) => {
        try {
            const id =
                req.params.id ||
                req.body[idField] ||
                req.body[`${table}Id`];

            if (!id) {
                return res.status(400).json({ message: 'Missing entity id' });
            }

            const pool = await poolPromise;
            const result = await pool.request()
                .input('Id', sql.Int, id)
                .query(`
                    SELECT ${stateField}
                    FROM ${table}
                    WHERE ${idField} = @Id
                `);

            if (!result.recordset.length) {
                return res.status(404).json({ message: 'Entity not found' });
            }

            const currentState = result.recordset[0][stateField];

            if (!allowedStates.includes(currentState)) {
                return res.status(409).json({
                    message: 'Invalid state',
                    currentState,
                    allowedStates
                });
            }

            req.currentState = currentState;
            next();
        } catch (err) {
            console.error('State middleware error:', err);
            res.status(500).json({ message: 'State check failed' });
        }
    };
};

module.exports = checkState;
