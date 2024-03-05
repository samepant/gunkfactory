export function formatCamelCaseWithSpaces(str: string): string {
  return str
    .replace(/([A-Z])/g, " $1") // add a space before all caps
    .replace(/^./, function (str) {
      return str.toUpperCase();
    }); // uppercase the first character
}
