/**
 * @author <code@tythos.net>
 */

/**
 * Basic function to call as an export. Returns square of input and prints a
 * message to console log.
 * 
 * @param {Number} a - Just a number
 * @returns {Number} - Square of input
 */
function jscibox(a) {
    console.log("hey i said something");
    return a * a;
}

export default Object.assign(jscibox, {
    "__tests__": {
        "can be tested": () => {
            expect(true).toEqual(true);
        }
    }
});
