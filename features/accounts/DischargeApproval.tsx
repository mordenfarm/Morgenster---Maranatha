import React, { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { Patient } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import LoadingSpinner from '../../components/utils/LoadingSpinner';
import Modal from '../../components/utils/Modal';
import { CheckCircle, XCircle, DollarSign, CreditCard, Receipt, Bed } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import firebase from 'firebase/compat/app';

const DischargeApproval: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const { addNotification } = useNotification();
    const { userProfile } = useAuth();

    const fetchPendingDischarges = async () => {
        setLoading(true);
        try {
            const snapshot = await db.collection('patients')
                .where('status', '==', 'PendingDischarge')
                .get();
            const patientList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
            setPatients(patientList);
        } catch (error) {
            console.error("Error fetching patients for discharge:", error);
            addNotification('Failed to fetch patient list.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingDischarges();
    }, []);

    const openModal = (patient: Patient, action: 'approve' | 'reject') => {
        setRejectionReason(''); // Reset reason
        setSelectedPatient(patient);
        setModalAction(action);
    };

    const closeModal = () => {
        setSelectedPatient(null);
        setModalAction(null);
    };

    const handleConfirm = async () => {
        if (!selectedPatient || !modalAction || !userProfile) return;

        if (modalAction === 'reject' && !rejectionReason.trim()) {
            addNotification('Please provide a reason for rejection.', 'warning');
            return;
        }

        const newStatus = modalAction === 'approve' ? 'Discharged' : 'Admitted';
        try {
            const patientRef = db.collection('patients').doc(selectedPatient.id!);
            const batch = db.batch();

            const updateData: any = {
                status: newStatus,
                dischargeRequesterId: firebase.firestore.FieldValue.delete()
            };

            if (modalAction === 'approve') {
                updateData.currentWardId = firebase.firestore.FieldValue.delete();
                updateData.currentWardName = firebase.firestore.FieldValue.delete();
                updateData.currentBedNumber = firebase.firestore.FieldValue.delete();

                // Find the latest admission record and update it with discharge info
                const admissionHistoryRef = patientRef.collection('admissionHistory');
                const query = admissionHistoryRef.orderBy('admissionDate', 'desc').limit(1);
                const snapshot = await query.get();

                if (!snapshot.empty) {
                    const latestAdmissionDoc = snapshot.docs[0];
                    if (!latestAdmissionDoc.data().dischargeDate) {
                        batch.update(latestAdmissionDoc.ref, {
                            dischargeDate: firebase.firestore.FieldValue.serverTimestamp(),
                            dischargedById: userProfile.id,
                            dischargedByName: `${userProfile.name} ${userProfile.surname}`
                        });
                    }
                }
            }

            if (modalAction === 'reject' && selectedPatient.dischargeRequesterId) {
                const notificationRef = db.collection('notifications').doc();
                batch.set(notificationRef, {
                    recipientId: selectedPatient.dischargeRequesterId,
                    senderId: userProfile.id,
                    senderName: `${userProfile.name} ${userProfile.surname}`,
                    title: 'Discharge Request Disapproved',
                    message: `The discharge request for patient ${selectedPatient.name} ${selectedPatient.surname} (${selectedPatient.hospitalNumber}) was disapproved. Reason: ${rejectionReason}`,
                    type: 'system_alert',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    read: false,
                });
            }
            
            batch.update(patientRef, updateData);
            await batch.commit();

            addNotification(`Patient status updated to ${newStatus}.`, 'success');
            fetchPendingDischarges(); // Refresh the list
            closeModal();
        } catch (error) {
            console.error(`Error updating patient status:`, error);
            addNotification('Failed to update patient status.', 'error');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Discharge Approval</h1>
            {patients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {patients.map(p => {
                        const hasBalance = p.financials.balance > 0;
                        return (
                            <div key={p.id} className="bg-[#161B22] border border-gray-700 rounded-xl p-6 shadow-md flex flex-col justify-between h-full hover:border-sky-500/50 transition-colors">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white truncate">{p.name} {p.surname}</h3>
                                            <p className="text-sm text-gray-400 font-mono">Hosp. No: {p.hospitalNumber}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-800/50 p-4 rounded-lg mb-6 border border-gray-700/50">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Outstanding Balance</p>
                                        <h2 className={`text-2xl font-extrabold ${hasBalance ? 'text-red-400' : 'text-green-400'}`}>
                                            ${p.financials.balance.toFixed(2)}
                                        </h2>
                                    </div>
                                    
                                    <div className="space-y-3 mb-6 text-sm text-gray-300">
                                        <div className="flex items-center justify-between border-b border-gray-700/50 pb-2">
                                            <div className="flex items-center gap-2 text-gray-400"><Receipt size={16} /> Total Bill</div>
                                            <span className="font-medium text-white">${p.financials.totalBill.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-gray-700/50 pb-2">
                                            <div className="flex items-center gap-2 text-gray-400"><CreditCard size={16} /> Amount Paid</div>
                                            <span className="font-medium text-white">${p.financials.amountPaid.toFixed(2)}</span>
                                        </div>
                                        {p.currentWardName && (
                                            <div className="flex items-center justify-between pt-1">
                                                <div className="flex items-center gap-2 text-gray-400"><Bed size={16} /> Location</div>
                                                <span className="font-medium text-sky-400">{p.currentWardName} <span className="text-gray-500 mx-1">•</span> Bed {p.currentBedNumber}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                    <button 
                                        onClick={() => openModal(p, 'reject')}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600/90 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
                                    >
                                        <XCircle size={18} /> Reject
                                    </button>
                                    <button
                                        onClick={() => !hasBalance && openModal(p, 'approve')}
                                        disabled={hasBalance}
                                        className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm ${
                                            hasBalance 
                                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                                            : 'bg-green-600 hover:bg-green-500'
                                        }`}
                                        title={hasBalance ? "Cannot approve with an outstanding balance" : "Approve discharge"}
                                    >
                                        <CheckCircle size={18} /> Approve
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center p-12 bg-[#161B22] border border-gray-700 rounded-lg">
                    <p className="text-gray-400 text-lg">No patients are currently pending discharge approval.</p>
                </div>
            )}
            {selectedPatient && (
                <Modal isOpen={!!modalAction} onClose={closeModal} title={`Confirm ${modalAction === 'approve' ? 'Approval' : 'Rejection'}`}>
                    <p className="text-gray-400">
                        Are you sure you want to {modalAction} the discharge for <span className="font-bold text-white">{selectedPatient.name} {selectedPatient.surname}</span>?
                    </p>
                     {modalAction === 'reject' && (
                        <div className="mt-4">
                            <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-300">Reason for Rejection (Required)</label>
                            <textarea
                                id="rejectionReason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                                className="mt-1 block w-full modern-input"
                                placeholder="e.g., Awaiting final lab results..."
                            />
                        </div>
                    )}
                    <div className="mt-6 flex justify-end space-x-4">
                        <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600">Cancel</button>
                        <button onClick={handleConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-md ${modalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                            Confirm {modalAction === 'approve' ? 'Approval' : 'Rejection'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DischargeApproval;