// Grabitt — Recruitment Job Categories. 20 sectors for the Canary Islands, each
// with 10 job types. Used across the recruitment area (CV builder: jobseekers
// pick their sector/role + months done; job advertising: employers set months
// of experience required). A "languages spoken" filter (EN/ES/DE/other) applies
// across ALL sectors — multilingual ability is a key hiring factor here.

export const JOB_LANGUAGES: [key: string, label: string][] = [
  ['en', 'English'], ['es', 'Spanish'], ['de', 'German'], ['sv', 'Swedish'], ['da', 'Danish'], ['other', 'Other'],
]

export const JOB_SECTORS: { name: string; jobs: string[] }[] = [
  { name: 'Hospitality & Catering', jobs: ['Chef / Cook', 'Kitchen Porter', 'Waiter / Waitress', 'Bartender', 'Barista', 'Restaurant Manager', 'Sommelier', 'Catering Assistant', 'Head Chef', 'Food & Beverage Supervisor'] },
  { name: 'Hotels & Accommodation', jobs: ['Receptionist / Front Desk', 'Housekeeper / Room Attendant', 'Hotel Manager', 'Concierge', 'Guest Services Agent', 'Night Auditor', 'Reservations Agent', 'Maintenance Technician', 'Pool & Leisure Attendant', 'Duty Manager'] },
  { name: 'Tourism & Leisure', jobs: ['Holiday Rep', 'Tour Guide', 'Excursion Coordinator', 'Activity Instructor', 'Entertainment / Animation Staff', 'Watersports Instructor', 'Diving Instructor', 'Ticket / Booking Agent', 'Resort Coordinator', 'Transfer Host'] },
  { name: 'Retail & Sales', jobs: ['Shop Assistant', 'Cashier', 'Sales Assistant', 'Store Manager', 'Visual Merchandiser', 'Stock Controller', 'Sales Representative', 'Retail Supervisor', 'Customer Advisor', 'E-commerce Assistant'] },
  { name: 'Construction & Trades', jobs: ['Builder / Bricklayer', 'Electrician', 'Plumber', 'Painter & Decorator', 'Carpenter / Joiner', 'Labourer', 'Tiler', 'Plasterer', 'Site Supervisor', 'Air Conditioning / Refrigeration Engineer'] },
  { name: 'Cleaning & Housekeeping', jobs: ['Domestic Cleaner', 'Commercial Cleaner', 'Holiday-Let Turnaround Cleaner', 'Window Cleaner', 'Housekeeping Supervisor', 'Janitor / Caretaker', 'Laundry Operative', 'Deep-Cleaning Specialist', 'Pool Cleaner', 'Cleaning Team Leader'] },
  { name: 'Health & Care', jobs: ['Nurse', 'Carer / Support Worker', 'Dentist', 'Physiotherapist', 'Care Home Assistant', 'Dental Hygienist', 'Optician', 'Pharmacy Assistant', 'Home Care Assistant', 'Medical Receptionist'] },
  { name: 'Beauty & Hairdressing', jobs: ['Hairdresser / Stylist', 'Barber', 'Beauty Therapist', 'Nail Technician', 'Massage Therapist', 'Spa Attendant', 'Aesthetician', 'Makeup Artist', 'Salon Manager', 'Lash & Brow Technician'] },
  { name: 'Admin & Office', jobs: ['Receptionist', 'Administrative Assistant', 'Personal Assistant (PA)', 'Data Entry Clerk', 'Office Manager', 'Gestoría Support Clerk', 'Secretary', 'Document Controller', 'HR Assistant', 'Executive Assistant'] },
  { name: 'Customer Service & Call Centre', jobs: ['Customer Service Agent', 'Call Centre Operator', 'Multilingual Support Agent', 'Technical Support Advisor', 'Complaints Handler', 'Live Chat Agent', 'Help Desk Assistant', 'Team Leader (Customer Service)', 'Account Support Executive', 'Retention Agent'] },
  { name: 'Driving & Delivery', jobs: ['Delivery Driver', 'Courier', 'Taxi Driver', 'Transfer / Shuttle Driver', 'Van Driver', 'Chauffeur', 'HGV / Lorry Driver', 'Rider (Food Delivery)', 'Removals Driver', 'Fleet Coordinator'] },
  { name: 'Warehouse & Logistics', jobs: ['Warehouse Operative', 'Picker / Packer', 'Forklift Driver', 'Stock Controller', 'Goods-In Assistant', 'Dispatch Coordinator', 'Inventory Clerk', 'Logistics Coordinator', 'Warehouse Supervisor', 'Supply Chain Assistant'] },
  { name: 'Property & Real Estate', jobs: ['Estate Agent', 'Lettings Agent', 'Property Manager', 'Holiday-Rental Manager', 'Real Estate Administrator', 'Viewings Coordinator', 'Property Valuer', 'Sales Negotiator', 'Building Manager / Community Admin', 'Real Estate Marketing Assistant'] },
  { name: 'Education & Languages', jobs: ['Teacher', 'TEFL / English Teacher', 'Private Tutor', 'Nursery / Childcare Assistant', 'Language Instructor', 'Teaching Assistant', 'Course Coordinator', 'Exam Invigilator', 'Online Tutor', 'Special Needs Assistant'] },
  { name: 'IT, Software & Data', jobs: ['Software Engineer / Developer', 'Data Engineer', 'Data Analyst', 'IT Support Technician', 'Systems Administrator', 'QA / Test Engineer', 'DevOps Engineer', 'Web Developer', 'Database Administrator', 'Cybersecurity Specialist'] },
  { name: 'Digital & Marketing', jobs: ['Social Media Manager', 'SEO Specialist', 'Content Writer / Copywriter', 'Graphic Designer', 'Digital Marketing Executive', 'Videographer / Editor', 'Photographer', 'PPC / Ads Specialist', 'Email Marketing Executive', 'Brand / Marketing Manager'] },
  { name: 'Remote & Freelance', jobs: ['Virtual Assistant', 'Translator', 'Freelance Writer', 'Online Consultant', 'Remote Project Manager', 'Freelance Designer', 'Transcriptionist', 'Online Community Manager', 'Remote Bookkeeper', 'Freelance Web Developer'] },
  { name: 'Finance & Professional', jobs: ['Accountant', 'Bookkeeper', 'Financial Advisor', 'Insurance Agent', 'Lawyer / Solicitor', 'Auditor', 'Payroll Administrator', 'Tax Advisor', 'Mortgage Advisor', 'Legal Assistant'] },
  { name: 'Skilled Technical', jobs: ['Mechanic', 'Marine Engineer', 'Electrical Engineer', 'HVAC / Refrigeration Technician', 'Welder / Fabricator', 'CNC Machinist', 'Boat / Yacht Technician', 'Solar / Renewables Installer', 'Maintenance Engineer', 'Auto Electrician'] },
  { name: 'Seasonal & Temporary', jobs: ['Seasonal Hospitality Staff', 'Event Staff', 'Promotional / Brand Ambassador', 'Summer Season Rep', 'Winter Season Worker', 'Festival / Concert Crew', 'Temporary Retail Assistant', 'Harvest / Agricultural Worker', 'Cover / Locum Staff', 'Holiday Cover Receptionist'] },
]

// Stable key for a job (sector index + job index), used to store months.
export const jobKey = (si: number, ji: number) => `s${si}j${ji}`
