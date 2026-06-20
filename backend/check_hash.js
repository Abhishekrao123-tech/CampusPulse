const bcrypt = require('bcryptjs');

const hashStudent = '$2a$10$wK1mNDqW2.51H2D8vP3VcuH2d3u.i4T/O8c/h5R8QjS27nL37m6bC';
const hashAdmin = '$2a$10$iMpxVvP1hM5wE15u3VvR9uW3BskZtG4.8uO6p2F67sH2.6iX52D3q';

console.log('Testing student password "password":');
try {
  const matchStudent = bcrypt.compareSync('password', hashStudent);
  console.log('Result:', matchStudent);
} catch (err) {
  console.error('Error:', err);
}

console.log('Testing admin password "admin123":');
try {
  const matchAdmin = bcrypt.compareSync('admin123', hashAdmin);
  console.log('Result:', matchAdmin);
} catch (err) {
  console.error('Error:', err);
}

// Generate new ones just in case
const newStudentHash = bcrypt.hashSync('password', 10);
const newAdminHash = bcrypt.hashSync('admin123', 10);
console.log('New student hash:', newStudentHash);
console.log('New admin hash:', newAdminHash);
