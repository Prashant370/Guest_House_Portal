import React, { useEffect, useState } from "react";
import { privateRequest } from "../utils/useFetch";
import "./AddRoom.css";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getDate } from "../utils/handleDate";

import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';


const style = {
	position: "absolute",
	top: "50%",
	left: "50%",
	transform: "translate(-50%, -50%)",
	width: 400,
	bgcolor: "background.paper",
	boxShadow: 24,
	p: 4,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	gap: 2,
};

export default function AddRoom() {
	const [rooms, setRooms] = useState([]);
	const [hoverOverRoom, setHoverOverRoom] = useState([]);
	const [open, setOpen] = useState(false);
	const [roomNumber, setRoomNumber] = useState("");
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [roomToDelete, setRoomToDelete] = useState(null);

	const user = useSelector((state) => state.user);
	const http = privateRequest(user.accessToken, user.refreshToken);

	const fetchRooms = async () => {
		try {
			const res = await http.get("/reservation/rooms");
			const currentDate = new Date();

			// Filter rooms based on the latest booking end date
			const updatedRooms = res.data.map((room) => {
				if (room.bookings.length > 0) {
					// Sort bookings by endDate
					room.bookings.sort(
						(a, b) => new Date(a.endDate) - new Date(b.endDate)
					);

					// Check if the last booking's end date has passed
					const lastBooking = room.bookings[room.bookings.length - 1];
					if (new Date(lastBooking.endDate) < currentDate) {
						room.bookings = []; // Mark room as available
					}
				}
				return room;
			});

			setRooms(updatedRooms);
		} catch (error) {
			if (error.response?.data?.message) {
				toast.error(error.response.data.message);
			} else {
				toast.error("Failed to fetch rooms");
			}
		}
	};
	
	const handleHoverOverRoom = (index, isHovering) => {
		setHoverOverRoom((prevState) =>
			prevState.map((value, i) => (i === index ? isHovering : value))
		);
	};

	const addRoom = async () => {
		// Check if the room number already exists
		const roomExists = rooms.some(room => room.roomNumber === parseInt(roomNumber));

		if (roomExists) {
			toast.error("Room with this number already exists");
		} else {
			try {
				const response = await http.post("/reservation/rooms", {
					roomNumber: roomNumber
				});

				const newRoom = response.data.room;

				let flag = true;

				// Update the rooms state to include the new room
				let updateRooms = [...rooms, newRoom];
				updateRooms.sort((a, b) => a.roomNumber - b.roomNumber);

				setRooms(updateRooms);

				toast.success(response.data.message);

				setRoomNumber("");
				setOpen(false);
			} catch (error) {
				if (error.response?.data?.message) {
					toast.error(error.response.data.message);
				} else {
					toast.error("Failed to add room");
				}
			}
		}
	};

	const handleDeleteRoom = (room) => {
		if (room.bookings.length > 0) {
			toast.error("This room is occupied. Please deallocate the room first.");
			return;
		}
		setRoomToDelete(room);
		setConfirmOpen(true);
	};

	const confirmDeleteRoom = async () => {
		if (!roomToDelete) return;
		try {
			const response = await http.delete("/reservation/rooms", {
				data: { roomId: roomToDelete._id }
			});

			const newRoom = response.data.room;

			const updateRooms = rooms.filter((room) => room._id !== newRoom._id);

			setRooms(updateRooms);

			toast.success("Room deleted successfully");
		} catch (error) {
			if (error.response?.data?.message) {
				toast.error(error.response.data.message);
			} else {
				toast.error("Failed to delete room");
			}
		} finally {
			setConfirmOpen(false);
			setRoomToDelete(null);
		}
	};

	const handleOpen = () => setOpen(true);
	const handleClose = () => setOpen(false);

	useEffect(() => {
		fetchRooms();
	}, []);

	useEffect(() => {
		const temp = rooms.map(() => false);
		setHoverOverRoom(temp);
	}, [rooms]);

	return (
		<div className="flex flex-col just start mt-5 gap-6">
			<div
				className="mt-5"
				style={{
					display: "grid",
					gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))`,
					gridGap: "20px",
				}}>
				{rooms.length > 0 && rooms.map((room, index) => (
					<div
						key={room._id}
						className={`relative ${room.bookings.length > 0
								? "booked-during-range rounded-lg bg-[rgb(191,190,190)] text-white"
								: "available border-[3px] border-green-500 rounded-lg"
							}`}
						onMouseOver={() => handleHoverOverRoom(index, true)}
						onMouseOut={() => handleHoverOverRoom(index, false)}>
						<div className="p-5 transition duration-300 ease">
							<h3>{room.roomNumber}</h3>
							{room.bookings.length > 0 && (
								<div
									className={`booking-info overflow-y-auto max-h-48 hidden bg-black bg-opacity-80 text-white p-2.5 rounded absolute top-full  left-0 w-full transition-opacity duration-300 ease z-50 ${hoverOverRoom[index] ? "room-booking-info-visible" : ""
										}`}>
									{room.bookings.toReversed().map((booking) => (
										<div key={"info-" + room.roomNumber} className="py-1">
											<p>
												Booked from: {getDate(booking.startDate)} to{" "}
												{getDate(booking.endDate)}
											</p>
											<p>User: {booking.user}</p>
										</div>
									))}
								</div>
							)}
						</div>
						{hoverOverRoom[index] && (
							<div
								className="absolute inset-0 bg-white bg-opacity-5 backdrop-blur-sm flex items-center justify-center"
							>
								<IconButton
									aria-label="delete room"
									onClick={() => handleDeleteRoom(room)}
								>
									<DeleteIcon />
								</IconButton>
							</div>
						)}
					</div>
				))}
			</div>
			{rooms.length === 0 &&
				<div className="mt-5 font-semibold text-xl flex justify-center w-full">
					Loading...
				</div>
			}
			{rooms.length > 0 && <div className="w-full flex justify-center items-center">
				<button
					className="bg-blue-500 text-white text-lg font-semibold rounded-lg w-32 p-2 text-center hover:bg-blue-600"
					onClick={handleOpen}>
					Add Room
				</button>
			</div>}
			<Modal
				open={open}
				onClose={handleClose}
				aria-labelledby="modal-modal-title"
				aria-describedby="modal-modal-description">
				<Box sx={style}>
					<div className="flex justify-between w-full">
						<div className="font-semibold text-lg ml-2">
							Room Details
						</div>
						<CloseIcon onClick={handleClose} style={{ cursor: "pointer" }} />
					</div>
					<div className="w-full flex justify-center">
						<TextField
							label="Room Number"
							value={roomNumber}
							onChange={(e) => setRoomNumber(e.target.value)}
							className="w-full"
						/>
					</div>
					<div className="w-full flex justify-center">
						<Button variant="contained" onClick={addRoom}>Add Room</Button>
					</div>
				</Box>
			</Modal>
			<Dialog
				open={confirmOpen}
				onClose={() => setConfirmOpen(false)}
			>
				<DialogTitle>{"Confirm Deletion"}</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Are you sure you want to delete this room?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmOpen(false)} color="primary">
						Cancel
					</Button>
					<Button onClick={confirmDeleteRoom} color="primary" autoFocus>
						Delete
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
}
