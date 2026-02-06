import { useState } from "react";
import Input from "../common/Input";
import styles from "./MemberSelector.module.css";
import { X } from "lucide-react";

// Mock search results
const MOCK_STUDENTS = [
    { student_id: "1904001", name: "John Doe", department: "CSE" },
    { student_id: "1904002", name: "Jane Smith", department: "ECE" },
    { student_id: "1904003", name: "Alice Johnson", department: "CSE" },
];

const MemberSelector = ({ selectedMembers, onMemberChange }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);

    const handleSearch = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (val.length > 1) {
            // Filter mock data (replace with API call)
            const filtered = MOCK_STUDENTS.filter(s =>
                s.name.toLowerCase().includes(val.toLowerCase()) ||
                s.student_id.includes(val)
            ).filter(s => !selectedMembers.some(m => m.student_id === s.student_id));
            setResults(filtered);
        } else {
            setResults([]);
        }
    };

    const addMember = (student) => {
        onMemberChange([...selectedMembers, student]);
        setQuery("");
        setResults([]);
    };

    const removeMember = (studentId) => {
        onMemberChange(selectedMembers.filter(m => m.student_id !== studentId));
    };

    return (
        <div className={styles.selectorContainer}>
            <label className={styles.label}>Add Members</label>

            <div className={styles.selectedList}>
                {selectedMembers.map(member => (
                    <div key={member.student_id} className={styles.memberTag}>
                        <span>{member.name}</span>
                        <button
                            type="button"
                            onClick={() => removeMember(member.student_id)}
                            className={styles.removeBtn}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <div className={styles.searchWrapper}>
                <Input
                    placeholder="Search by name or ID..."
                    value={query}
                    onChange={handleSearch}
                />

                {results.length > 0 && (
                    <ul className={styles.resultsDropdown}>
                        {results.map(student => (
                            <li
                                key={student.student_id}
                                className={styles.resultItem}
                                onClick={() => addMember(student)}
                            >
                                <div className={styles.resultName}>{student.name}</div>
                                <div className={styles.resultMeta}>{student.student_id} • {student.department}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default MemberSelector;
