import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase' 

// '' (unanswered) -> null, so integer and enum columns don't reject it
const orNull = (v: unknown) =>
    typeof v === 'string' && v.trim() !== '' ? v.trim() : null

const toInt = (v: unknown) => {
    if (typeof v === 'number') return Math.round(v)
    const m = typeof v === 'string' ? v.match(/\d+/) : null
    return m ? parseInt(m[0], 10) : null
}

export async function GET() {
    const { data, error } = await supabase
        .from('users_table')
        .select('*') //Selects the entire table

    if(error){
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
}

export async function POST(request : Request){

    //Exception handling in the event of entered garbage value
    let body 
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON'}, { status: 400 })
    }

    //Name and email validation because those fields are mandatory
    if(!body.firstName || !body.lastName || !body.email){
        return NextResponse.json(
            { error: 'Name and email required'},
            { status: 400 }
        )
    }

    //stores boolean value to determine if additional roommate questions will have values 
    const wantsRoommates = body.roommates === 'yes' 

    //creates a new object with the fields selected by me instead of only what is sent by the client
    const row = {
        //auth fields 
        first_name: body.firstName,
        last_name: body.lastName,
        student_email: body.email,
        //user_city: orNull(body.city),
        company_name: orNull(body.company),
        office_address: orNull(body.address),
        monthly_budget: orNull(body.budget),
        wants_roommates: wantsRoommates,
        user_interests: body.interests ?? null,
        housing_style: orNull(body.housingType),
        user_accommodations: body.accommodations ?? null,
        move_in_date: orNull(body.moveIn),
        user_transportation: orNull(body.commuteMode),
        has_car: orNull(body.car),
        commute_time: toInt(body.maxCommute),
        public_transit_importance: toInt(body.transitImportance),

        //only if the user selected 'yes' to wanting roommates
        preferred_roommate_gender: wantsRoommates ? orNull(body.gender) : null,
        number_of_roommates: wantsRoommates ? toInt(body.numRoommates) : null,
        noise_level: wantsRoommates ? orNull(body.noise) : null,
        cleanliness: wantsRoommates ? orNull(body.cleanliness) : null,
        has_guests: wantsRoommates ? orNull(body.guests) : null,
        sleep_schedule: wantsRoommates ? orNull(body.sleep) : null,
        temperature: wantsRoommates ? toInt(body.temperature) : null,
        age_group: wantsRoommates ? orNull(body.age) : null,
        
    }

    //adds the row to the table
    const { data, error } = await supabase
    .from('users_table')
    .insert(row)
    .select()

    //computer response to show if things worked smoothly
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
        return NextResponse.json(data, { status: 201 })

}

